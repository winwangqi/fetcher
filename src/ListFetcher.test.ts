import ListFetcher from './ListFetcher'

describe('test ListFetcher', () => {
  test('test page number and hasMore', async () => {
    let count = 0

    const onSuccessCallback = jest.fn()

    const listFetcher = new ListFetcher<number[], number[], null>({
      request() {
        return new Promise((resolve) => {
          resolve([count++])
        })
      },

      isThereMore(res) {
        return res < 2
      },

      onSuccess: onSuccessCallback,

      responsePipe(res) {
        return [...(this.data || []), ...res]
      },
    })

    expect(listFetcher.hasMore).toBe(true)
    expect(listFetcher.page).toBe(1)
    expect(listFetcher.data).toBe(null)

    await listFetcher.fetch()
    expect(listFetcher.hasMore).toBe(true)
    expect(listFetcher.page).toBe(2)
    expect(listFetcher.data).toStrictEqual([0])

    await listFetcher.fetch()
    expect(listFetcher.hasMore).toBe(true)
    expect(listFetcher.page).toBe(3)
    expect(listFetcher.data).toStrictEqual([0, 1])

    await listFetcher.fetch()
    expect(listFetcher.hasMore).toBe(false)
    expect(listFetcher.page).toBe(4)
    expect(listFetcher.data).toStrictEqual([0, 1, 2])

    try {
      await listFetcher.fetch()
      expect(listFetcher.hasMore).toBe(false)
      expect(listFetcher.page).toBe(4)
      expect(listFetcher.data).toStrictEqual([0, 1, 2])
    } catch (err) {
      expect(err).toBe('block by request interceptor')
    }
  })
})
