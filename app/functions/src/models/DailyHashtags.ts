import {Window} from './Window'
import {Hashtag} from './Hashtag'

export interface DailyHashtags {
    collection: Hashtag[]
    events: number
    timestamp: number
    window: Window
}