# Fetcher

An elegant and easy-to-use JavaScript library for managing the request process.

[中文文档](./doc/中文文档.md)

## get started

### Installation

```bash
npm install -save @winwangqi/fetcher
```

### Usage

```javascript
const fetcher = new Fetcher({
  request() {
    // return request promise
  },

  onSuccess(response) {
    // do something...
  },

  // other options
})

// return request promise
fetcher.fetch()
```

## API

### Options

| field         | type                                                                                                    | default | required | description                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------- | ------- | -------- | ------------------------------------------------------------------------------------------------------- |
| request       | () => Promise                                                                                           | /       | Y        | Request method, the return value must be Promise                                                        |
| concurrent    | boolean                                                                                                 | true    | N        | Whether to support concurrent. If not, there can be only one request in fetching state at the same time |
| timeoutMs     | number                                                                                                  | 0       | N        | Request timeout duration. Request timeout throws TimeoutException                                       |
| maxRetryTimes | number                                                                                                  | 0       | N        | Maximum number of retries when the request fails                                                        |
| onPending     | Function                                                                                                | /       | N        | onPending event handler, triggered when the request is started                                          |
| onSuccess     | (responseAfterPipe) => void                                                                             | /       | N        | onSuccess event handler, triggered when the request is successful                                       |
| onFailure     | Function                                                                                                | /       | N        | onFailure event handler, triggered when the request fails                                               |
| onComplete    | ({ ok: boolean, payload: responseAfterPipe }) => void                                                   | /       | N        | onComplete event handler, triggered when the request is completed (success or failure)                  |
| onChange      | ({ status: 'pending' / 'success' / 'failure', payload: responseAfterPipe / error / undefined }) => void | /       | N        | onChange event handler, triggered when the request status changes                                       |
| onTimeout     | Function                                                                                                | /       | N        | onTimeout event handler, triggered by request timeout                                                   |
| responsePipe  | response => responseAfterPipe                                                                           | /       | N        | Pipeline for formatting Response data                                                                   |

### `Fetcher` instance properties

| filed    | type    | default | description                           |
| -------- | ------- | ------- | ------------------------------------- |
| fetching | boolean | false   | Is fetching                           |
| fetched  | boolean | false   | Whether the request is completed      |
| data     | boolean | null    | Response value for successful request |
| error    | boolean | null    | Request failed error                  |

### `fetcher.fetch` return value

`fetcher.fetch` return value is promise

| field  | type                        | description                                  |
| ------ | --------------------------- | -------------------------------------------- |
| then   | (responseAfterPipe) => void | Request completion callback function         |
| catch  | (error) => void             | Request failed callback function             |
| cancel | Function                    | Cancel request                               |
| clear  | Function                    | Clear the timeout countdown for this request |

## Demo

### React

```jsx
class Example extends React.PureCompoennt {
  constructor(props) {
    super(props)

    const self = this

    this.setState(
      {
        fetcher: new Fetcher({
          request() {
            return new Promise((resolve, reject) => {
              setTimeout(() => {
                resolve('resolved')
              }, 1000)
            })
          },

          timeoutMS: 500,

          onChange() {
            self.forceUpdate()
          },
        }),
      },
      () => {
        this.state.fetcher.fetch()
      }
    )
  }

  render() {
    const { fetcher } = this.state

    return fetcher.fetched ? (
      <div>{fetcher.data}</div>
    ) : fetcher.fetching ? (
      <div>loading...</div>
    ) : fetcher.error ? (
      <div>error: {fetcher.error}</div>
    ) : null
  }
}
```

> Since the request status is updated inside the `fetcher`, `forceUpdate` needs to be called in the onChange event to notify react to re-render

### Vue

```vue
<template>
  <div v-if="fetcher.fetched">{{ fetcher.data }}</div>
  <div v-else>
    <div v-if="fetcher.fetching">loading</div>
    <div v-else-if="fetcher.error">{{ fetcher.error }}</div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      fetcher: new Fetcher({
        request() {
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              resolve('resolved')
            }, 1000)
          })
        },

        timeoutMS: 500,
      }),
    }
  },

  mounted() {
    this.fetcher.fetch()
  },
}
</script>
```
