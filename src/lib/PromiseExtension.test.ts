import {
  CancellablePromise,
  CancellationException,
  TimeoutException,
  TimeoutPromise,
} from './PromiseExtension'

describe('test CancellablePromise', () => {
  test('CancellablePromise can be resolved', async () => {
    const cancellablePromise = new CancellablePromise<string>((resolve) => {
      setTimeout(() => {
        resolve('resolved')
      }, 100)
    })

    const catchCallback = jest.fn()

    try {
      const response = await cancellablePromise
      expect(response).toBe('resolved')
    } catch (err) {
      catchCallback()
    }

    expect(catchCallback.mock.calls.length).toBe(0)
  })

  test('CancellablePromise can be cancelled', () => {
    const cancellablePromise = new CancellablePromise<string>((resolve) => {
      setTimeout(() => {
        resolve('resolved')
      }, 100)
    })

    cancellablePromise.cancel()

    return cancellablePromise.catch((err) => {
      expect(err).toBeInstanceOf(CancellationException)
    })
  })

  test('CancellablePromise can be chain call', () => {
    const cancellablePromise = new CancellablePromise<string>((resolve) => {
      setTimeout(() => {
        resolve('resolved')
      }, 100)
    })

    cancellablePromise.cancel()

    return cancellablePromise
      .then(null, (err) => {
        expect(err).toBeInstanceOf(CancellationException)
        return 123
      })
      .then((res) => {
        expect(res).toBe(123)
      })
  })
})

describe('test TimeoutPromise', () => {
  test(`TimeoutPromise don't timeout`, async () => {
    const timeoutPromise = new TimeoutPromise<string>((resolve) => {
      setTimeout(() => {
        resolve('resolved')
      }, 100)
    })

    jest.useFakeTimers()
    jest.advanceTimersByTime(200)

    return timeoutPromise.then((res) => {
      expect(res).toBe('resolved')
    })
  })

  describe(`TimeoutPromise don't set timeout when timeoutMS less than 1`, () => {
    test('when timeoutMS is 0', () => {
      const timeoutPromise = new TimeoutPromise<string>((resolve) => {
        setTimeout(() => {
          resolve('resolved')
        }, 100)
      }, 0)

      jest.useFakeTimers()
      jest.advanceTimersByTime(200)

      return timeoutPromise.then((res) => {
        expect(res).toBe('resolved')
      })
    })

    test('when timeoutMS less than 0', () => {
      const timeoutPromise = new TimeoutPromise<string>((resolve) => {
        setTimeout(() => {
          resolve('resolved')
        }, 100)
      }, -1)

      jest.useFakeTimers()
      jest.advanceTimersByTime(200)

      return timeoutPromise.then((res) => {
        expect(res).toBe('resolved')
      })
    })
  })

  test('TimeoutPromise timeout can return correct result', () => {
    const timeoutPromise = new TimeoutPromise<string>((resolve) => {
      setTimeout(() => {
        resolve('resolved')
      }, 100)
    }, 20)

    jest.useFakeTimers()
    jest.advanceTimersByTime(200)

    return timeoutPromise.catch((err) => {
      expect(err).toBeInstanceOf(TimeoutException)
    })
  })

  test('TimeoutPromise timeout can be clear', () => {
    const timeoutPromise = new TimeoutPromise<string>((resolve) => {
      setTimeout(() => {
        resolve('resolved')
      }, 100)
    }, 20)

    timeoutPromise.clear()

    jest.useFakeTimers()
    jest.advanceTimersByTime(200)

    expect(timeoutPromise.then((res) => expect(res).toBe('resolved')))
  })

  test('TimeoutPromise methods can be chain call', () => {
    const timeoutPromise = new TimeoutPromise<string>((resolve) => {
      setTimeout(() => {
        resolve('resolved')
      }, 100)
    }, 20)

    timeoutPromise.cancel().clear()

    jest.useFakeTimers()
    jest.advanceTimersByTime(200)

    return timeoutPromise
      .then((res) => {
        expect(res).toBe('resolved')
      })
      .catch((err) => {
        expect(err).toBeInstanceOf(CancellationException)
      })
  })
})
