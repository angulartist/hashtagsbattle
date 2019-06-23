import * as functions from 'firebase-functions'
import {db, rsvpsOutput, serverTimestamp, transaction} from './_config/main.config'
import {dailyWindowsRef, eventWindowsRef, getTimestampIdentifier, trendsRef} from './helpers'
import {EventsSnapshot, Category, CategoryType, DailyHashtags, TrendingHashtags, Hashtag} from './models'

/**
 * Update timeley-processed events counter.
 * @param output
 */
const handleEventsUpdate = (output: EventsSnapshot) => {
    try {
        const {timestamp, window, snapshot} = output
        const eventWindowRef = eventWindowsRef.doc(`snap_${getTimestampIdentifier(window.end)}`)

        return eventWindowRef.set({
            events: transaction.increment(snapshot),
            lastUpdated: serverTimestamp,
            timestamp,
            window
        }, {merge: true})
    } catch (e) {
        throw new Error(e)
    }
}

/**
 * Update daily hashtags aggregation.
 * @param output
 */
const handleDailyHashtagsUpdate = (output: DailyHashtags) => {
    const {timestamp, window, events, collection} = output
    const hashtagsTimestampRef = dailyWindowsRef.doc(`day_${getTimestampIdentifier(window.end)}`)
    const hashtagsRef = hashtagsTimestampRef.collection('hashtags')
    const batch = db.batch()

    batch.set(hashtagsTimestampRef, {
        processedEvents: transaction.increment(events),
        lastUpdated: serverTimestamp,
        timestamp,
        window
    }, {merge: true})

    collection.forEach((hashtag: Hashtag) => {
        const {key, tag, score} = hashtag
        const hashtagRef = hashtagsRef.doc(`${key}`)
        batch.set(hashtagRef, {
            tag,
            score
        }, {merge: true})
    })

    try {
        return batch.commit()
    } catch (e) {
        throw new Error(e)
    }
}

/**
 * Update trending hashtags aggregation.
 * @param output
 */
const handleTrendingHashtagsUpdate = (output: TrendingHashtags) => {
    try {
        const {timestamp, window, collection} = output

        return trendsRef.set({
            hashtags: collection,
            lastUpdated: serverTimestamp,
            timestamp,
            window
        }, {merge: true})
    } catch (e) {
        throw new Error(e)
    }
}

/**
 * __main__
 */
export const onPublishTweets = functions.pubsub
    .topic(rsvpsOutput)
    .onPublish(async (payload: functions.pubsub.Message) => {
        const {category, output} = JSON.parse(Buffer.from(payload.data, 'base64').toString())

        if (!category || !output) throw new Error('Payload Bad Format.')

        switch (category) {
            case CategoryType.get(Category.GLOBAL_EVENTS):
                return handleEventsUpdate(output)
            case CategoryType.get(Category.DAILY_HASHTAGS):
                return handleDailyHashtagsUpdate(output)
            case CategoryType.get(Category.TRENDING_HASHTAGS):
                return handleTrendingHashtagsUpdate(output)
            default:
                throw new Error('Unknown Category Type.')
        }
    })