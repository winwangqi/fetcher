import Fetcher from './Fetcher'

const fetchData: (options: {
  success?: boolean
  delay?: number
  response?: string
  error?: string
}) => Promise<string> = ({
  success = true,
  delay = 30,
  response = 'response',
  error = 'error',
}) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (success) {
        resolve(response)
      } else {
        reject(error)
      }
    }, delay)
  })
}

describe('test Fetcher', () => {
  test('fetcher has correct default properties', () => {
    const fetcher = new Fetcher<string, string, string>({
      request() {
        return fetchData({})
      },
    })

    expect(fetcher.concurrent).toBe(true)
    expect(fetcher.maxRetryTimes).toBe(0)
    expect(fetcher.fetching).toBe(false)
    expect(fetcher.fetched).toBe(false)
    expect(fetcher.data).toBe(null)
    expect(fetcher.error).toBe(null)
  })

  describe('test fetch result', () => {
    test('fetch data success', async () => {
      const onChangeCallback = jest.fn()
      const onFailureCallback = jest.fn()

      const fetcher = new Fetcher<string, string, string>({
        request() {
          return fetchData({ success: true })
        },

        onPending() {
          expect(this.fetching).toBe(true)
        },

        onSuccess() {
          expect(this.fetching).toBe(false)
          expect(this.fetched).toBe(true)
          expect(this.data).toBe('response')
          expect(this.error).toBe(null)
        },

        onFailure: onFailureCallback,

        onComplete() {
          expect(this.fetching).toBe(false)
          expect(this.fetched).toBe(true)
          expect(this.data).toBe('response')
          expect(this.error).toBe(null)
        },

        onChange() {
          onChangeCallback()

          if (this.fetching) {
            expect(onChangeCallback.mock.calls.length).toBe(1)
          } else {
            expect(onChangeCallback.mock.calls.length).toBe(2)
          }
        },
      })

      const response = await fetcher.fetch()

      expect(response).toBe('response')
      expect(onFailureCallback.mock.calls.length).toBe(0)
    })

    test('fetch data failure', async () => {
      const onChangeCallback = jest.fn()
      const onSuccessCallback = jest.fn()

      const fetcher = new Fetcher<string, string, string>({
        request() {
          return fetchData({ success: false })
        },

        onPending() {
          expect(this.fetching).toBe(true)
        },

        onSuccess: onSuccessCallback,

        onFailure() {
          expect(this.fetching).toBe(false)
          expect(this.fetched).toBe(false)
          expect(this.data).toBe(null)
          expect(this.error).toBe('error')
        },

        onComplete() {
          expect(this.fetching).toBe(false)
          expect(this.fetched).toBe(false)
          expect(this.data).toBe(null)
          expect(this.error).toBe('error')
        },

        onChange() {
          onChangeCallback()

          if (this.fetching) {
            expect(onChangeCallback.mock.calls.length).toBe(1)
          } else {
            expect(onChangeCallback.mock.calls.length).toBe(2)
          }
        },
      })

      try {
        await fetcher.fetch()
      } catch (err) {
        expect(err).toBe('error')
        expect(onSuccessCallback.mock.calls.length).toBe(0)
      }
    })
  })

  describe('test concurrent', () => {
    test('concurrent is true', async () => {
      const onPendingCallback = jest.fn()

      const fetcher = new Fetcher({
        request() {
          return fetchData({ error: 'fuck' })
        },

        onPending: onPendingCallback,

        concurrent: true,
      })

      await Promise.all([fetcher.fetch(), fetcher.fetch()])

      expect(onPendingCallback.mock.calls.length).toBe(2)
    })

    test('concurrent is false', async () => {
      const onPendingCallback = jest.fn()

      const fetcher = new Fetcher({
        request() {
          return fetchData({})
        },

        onPending: onPendingCallback,

        concurrent: false,
      })

      await Promise.all([
        fetcher.fetch().catch((_) => _),
        fetcher.fetch().catch((_) => _),
      ])

      expect(onPendingCallback.mock.calls.length).toBe(1)
    })
  })

  describe('test timeout', () => {
    test('not timeout', async () => {
      const onTimeoutCallback = jest.fn()

      const fetcher = new Fetcher({
        request() {
          return fetchData({})
        },

        onTimeout: onTimeoutCallback,
      })

      const response = await fetcher.fetch()

      expect(response).toBe('response')
      expect(onTimeoutCallback.mock.calls.length).toBe(0)
    })

    test('does timeout', async () => {
      const onTimeoutCallback = jest.fn()

      const fetcher = new Fetcher({
        request() {
          return fetchData({ delay: 100 })
        },

        timeoutMs: 50,

        onTimeout: onTimeoutCallback,
      })

      try {
        await fetcher.fetch()
      } catch (err) {}

      // jest.advanceTimersByTime(200)

      expect(onTimeoutCallback.mock.calls.length).toBe(1)
    })
  })

  describe('test retry', () => {
    test('maxRetryTimes is 0', () => {
      const onPendingCallback = jest.fn()

      const fetcher = new Fetcher({
        request() {
          return fetchData({ success: false })
        },

        maxRetryTimes: 0,

        onPending: onPendingCallback,
      })

      return fetcher.fetch().catch((err) => {
        expect(err).toBe('error')
        expect(onPendingCallback.mock.calls.length).toBe(1)
      })
    })

    test('maxRetryTimes is 3 and result is failed', () => {
      const onPendingCallback = jest.fn()
      const onFailureCallback = jest.fn()

      const fetcher = new Fetcher({
        request() {
          return fetchData({ success: false })
        },

        maxRetryTimes: 3,

        onPending: onPendingCallback,

        onFailure: onFailureCallback,
      })

      return fetcher.fetch().catch((err) => {
        expect(err).toBe('error')

        expect(onPendingCallback.mock.calls.length).toBe(4)
        expect(onFailureCallback.mock.calls.length).toBe(1)
      })
    })

    test('maxRetryTimes is 3 and result is succeed', async () => {
      let requestCount = 0

      const onPendingCallback = jest.fn()
      const onSuccessCallback = jest.fn()
      const onFailureCallback = jest.fn()

      const fetcher = new Fetcher({
        request() {
          requestCount++
          return fetchData({ success: requestCount > 2 })
        },

        maxRetryTimes: 3,

        onPending: onPendingCallback,
        onSuccess: onSuccessCallback,
        onFailure: onFailureCallback,
      })

      const response = await fetcher.fetch().catch((_) => _)

      expect(response).toBe('response')
      expect(onPendingCallback.mock.calls.length).toBe(3)
      expect(onSuccessCallback.mock.calls.length).toBe(1)
      expect(onFailureCallback.mock.calls.length).toBe(0)
    })
  })

  test('format response by responsePipe', () => {
    const fetcher = new Fetcher<string, string, string>({
      request() {
        return fetchData({ success: true })
      },

      responsePipe(res) {
        return `after responsePipe: ${res}`
      },

      onPending() {
        expect(this.fetching).toBe(true)
      },

      onSuccess() {
        expect(this.fetching).toBe(false)
        expect(this.fetched).toBe(true)
        expect(this.data).toBe('after responsePipe: response')
        expect(this.error).toBe(null)
      },
    })

    return fetcher.fetch().then((response) => {
      expect(response).toBe('after responsePipe: response')
    })
  })
})
