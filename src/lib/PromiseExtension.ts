export class CancellationException {
  constructor(public message: string = 'CancellationException') {}

  public toString() {
    return this.message
  }
}

export class TimeoutException {
  constructor(public message: string = 'TimeoutException') {}

  public toString() {
    return this.message
  }
}

interface CancellableSignal {
  signal: Promise<never>
  cancel: Function
}

function createCancellableSignal(defaultError: any): CancellableSignal {
  let cancel = null
  const signal = new Promise<never>((resolve, reject) => {
    cancel = (error: any) => {
      reject(error || defaultError)
    }
  })

  return { signal, cancel }
}

type PromiseExecutor<T> = (
  resolve: (value?: T | PromiseLike<T>) => void,
  reject: (reason?: any) => void
) => void

export class CancellablePromise<T> {
  constructor(
    executor: PromiseExecutor<T>,
    cancellableSignal?: CancellableSignal
  ) {
    const { signal, cancel } =
      cancellableSignal || createCancellableSignal(new CancellationException())

    this.promise = new Promise<T>((resolve, reject) => {
      new Promise(executor).then(resolve).catch(reject)
      signal.catch(reject)
    })

    this.cancel = (...rest) => {
      cancel(...rest)
      return this
    }
  }

  private readonly promise: Promise<T>

  public cancel: Function

  public then<TResult1 = T, TResult2 = never>(
    onFulfilled?:
      | ((value: T) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onRejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null
  ): Promise<TResult1 | TResult2> {
    return this.promise.then.call(this.promise, onFulfilled, onRejected)
  }

  public catch<TResult = never>(
    onRejected?:
      | ((reason: any) => TResult | PromiseLike<TResult>)
      | undefined
      | null
  ): Promise<T | TResult> {
    return this.promise.catch.call(this.promise, onRejected)
  }

  public finally(onFinally: () => void) {
    return this.promise.finally.call(this.promise, onFinally)
  }
}

export class TimeoutPromise<T> extends CancellablePromise<T> {
  constructor(executor: PromiseExecutor<T>, timeoutMS = 0) {
    super(executor)

    let timer = null

    if (timeoutMS > 0) {
      timer = setTimeout(() => {
        this.cancel(new TimeoutException())
      }, timeoutMS)
    }

    this.clear = () => {
      timer && clearTimeout(timer)
      return this
    }
  }

  public clear: Function

  public then<TResult1 = T, TResult2 = never>(
    onFulfilled?:
      | ((value: T) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onRejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null
  ): Promise<TResult1 | TResult2> {
    return super.then.call(this, onFulfilled, onRejected)
  }

  public catch<TResult = never>(
    onRejected?:
      | ((reason: any) => TResult | PromiseLike<TResult>)
      | undefined
      | null
  ): Promise<T | TResult> {
    return super.catch.call(this, onRejected)
  }

  public finally(onFinally) {
    return super.finally.call(this, (...rest) => {
      this.clear()
      onFinally(...rest)
    })
  }
}
