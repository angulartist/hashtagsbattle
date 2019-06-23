import {db} from '../_config/main.config'

export const tweetsRef = db.collection('tweets')
export const dailyRef = tweetsRef.doc('daily')
export const dailyWindowsRef = dailyRef.collection('windows')
export const eventsRef = tweetsRef.doc('events')
export const eventWindowsRef = eventsRef.collection('windows')
export const trendsRef = tweetsRef.doc('trends')