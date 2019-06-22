import {Window} from './Window'
import {Hashtag} from './Hashtag'

export interface TrendingHashtags {
    collection: Hashtag[]
    timestamp: number
    window: Window
}