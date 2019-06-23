export enum Category {
    GLOBAL_EVENTS,
    DAILY_HASHTAGS,
    TRENDING_HASHTAGS
}

export const CategoryType = new Map<number, string>([
    [Category.GLOBAL_EVENTS, 'GLOBAL_EVENTS'],
    [Category.DAILY_HASHTAGS, 'DAILY_HASHTAGS'],
    [Category.TRENDING_HASHTAGS, 'TRENDING_HASHTAGS']
])