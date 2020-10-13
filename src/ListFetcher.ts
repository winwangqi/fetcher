import Fetcher, { Options as FetcherOptions } from './Fetcher'

interface Options<Response, ResponseAfterPipe>
  extends FetcherOptions<Response, ResponseAfterPipe> {
  isThereMore: (Response) => boolean
}

export default class ListFetcher<
  Response,
  ResponseAfterPipe,
  Error
> extends Fetcher<Response, ResponseAfterPipe, Error> {
  public page = 1
  public hasMore = true

  private isThereMore: (Response) => boolean

  constructor(options: Options<Response, ResponseAfterPipe>) {
    super(options)
    Object.assign(this, options)
  }

  protected onSuccessHook: (Response) => void = (response: Response) => {
    super.onSuccessHook && super.onSuccessHook(response)
    this.page++
    this.hasMore = this.isThereMore(response)
  }

  protected requestInterceptor(): boolean {
    return super.requestInterceptor() && this.hasMore
  }
}
