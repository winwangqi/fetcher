import { TimeoutException, TimeoutPromise } from './lib/PromiseExtension'

export interface Options<Response, ResponseAfterPipe> {
  request: () => Promise<Response>
  concurrent?: boolean
  timeoutMs?: number
  maxRetryTimes?: number

  onPending?: Function
  onSuccess?: Function
  onFailure?: Function
  onComplete?: Function

  onChange?: OnChange
  onTimeout?: Function

  responsePipe?: (response: Response) => Response | ResponseAfterPipe
}

type OnChange = (onChangeArguments: OnChangeArguments) => any

interface OnChangeArguments {
  status: Status
  payload?: any
}

enum Status {
  Pending = 'pending',
  Success = 'success',
  Failure = 'failure',
}

export default class Fetcher<Response, ResponseAfterPipe, Error> {
  private request: () => Promise<Response>

  public concurrent = true
  public timeoutMs = 0
  public maxRetryTimes = 0

  public fetching = false
  public fetched = false
  public data: Response | ResponseAfterPipe = null
  public error: Error = null

  private onPending = Function.prototype
  private onSuccess = Function.prototype
  private onFailure = Function.prototype
  private onComplete = Function.prototype

  protected onSuccessHook?: (response: Response) => void
  private onFailureHook = Function.prototype

  private onChange?: OnChange = (_) => _
  private onTimeout = Function.prototype

  private responsePipe: (response: Response) => Response | ResponseAfterPipe = (
    _
  ) => _

  private retryTimes = 0

  constructor(options: Options<Response, ResponseAfterPipe>) {
    Object.assign(this, options)
  }

  public fetch():
    | Promise<Response | ResponseAfterPipe | Error>
    | TimeoutPromise<Response | ResponseAfterPipe | Error> {
    // request interceptor
    if (!this.requestInterceptor())
      return Promise.reject('block by request interceptor')

    this.fetching = true

    this.onPending()
    this.onChange({ status: Status.Pending })

    const requestPromise = this.request()
      .then((response) => {
        const responseAfterPipe = this.responsePipe(response)

        this.fetching = false
        this.fetched = true
        this.data = responseAfterPipe

        this.onSuccessHook && this.onSuccessHook(response)

        this.onSuccess(responseAfterPipe)
        this.onChange({ status: Status.Success, payload: responseAfterPipe })
        this.onComplete({ ok: true, payload: responseAfterPipe })

        return responseAfterPipe
      })
      .catch((error) => {
        if (this.retryTimes < this.maxRetryTimes) {
          this.retryTimes++
          this.fetching = false
          return this.fetch()
        }

        this.fetching = false
        this.error = error

        this.onFailureHook()

        this.onFailure(error)
        this.onChange({ status: Status.Failure, payload: error })
        this.onComplete({ ok: false, payload: error })

        return Promise.reject(error)
      })

    return new TimeoutPromise<Response | ResponseAfterPipe | Error>(
      (resolve, reject) => {
        requestPromise.then(resolve).catch(reject)
      },
      this.timeoutMs
    ).catch((err) => {
      if (err instanceof TimeoutException) {
        this.onTimeout()
      }

      return Promise.reject(err)
    })
  }

  protected requestInterceptor() {
    return !(!this.concurrent && this.fetching)
  }
}
