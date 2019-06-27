import NodeCache from 'node-cache'

class Cache {

    constructor(ttlSeconds) {
        this.cache = new NodeCache({
            stdTTL: ttlSeconds,
            checkperiod: ttlSeconds * 0.2,
            useClones: false
        })
    }

    set(key, value) {
        this.cache.set(key, value)
    }

    get(key, storeFunction) {
        const value = this.cache.get(key)
        if (value) {
            return Promise.resolve(value)
        }

        return storeFunction().then((result) => {
            this.cache.set(key, result)
            return result
        })
    }

    del(keys) {
        this.cache.del(keys)
    }

    flush() {
        this.cache.flushAll()
    }
}


export default Cache