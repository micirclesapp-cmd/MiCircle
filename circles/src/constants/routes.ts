export const Routes = {
  // Auth Stack
  SPLASH: 'Splash',
  DISPLAY_NAME: 'DisplayName',
  AVATAR: 'Avatar',
  BIO: 'Bio',
  INTENT: 'Intent',

  // Main Tab Navigator
  FEED_TAB: 'FeedTab',
  CIRCLES_TAB: 'CirclesTab',
  PLANS_TAB: 'PlansTab',
  PROFILE_TAB: 'ProfileTab',

  // Feed Stack
  FEED: 'Feed',
  OPEN_CIRCLE_DETAIL: 'OpenCircleDetail',
  CREATE_OPEN_CIRCLE: 'CreateOpenCircle',

  // Circle Stack
  CIRCLES_HOME: 'CirclesHome',
  CIRCLE: 'Circle',
  CIRCLE_CHAT: 'CircleChat',
  CIRCLE_PLANNER: 'CirclePlanner',
  CIRCLE_MEMORY_LANE: 'CircleMemoryLane',
  CIRCLE_EXPENSES: 'CircleExpenses',
  CIRCLE_MEMBERS: 'CircleMembers',
  CIRCLE_SETTINGS: 'CircleSettings',
  CREATE_CIRCLE: 'CreateCircle',
  JOIN_CIRCLE: 'JoinCircle',
  AVAILABILITY_CHECK: 'AvailabilityCheck',
  ADD_EXPENSE: 'AddExpense',
  CREATE_POLL: 'CreatePoll',

  // Plan Stack
  PLANS_HOME: 'PlansHome',
  PLAN_DETAIL: 'PlanDetail',
  CREATE_PLAN: 'CreatePlan',

  // Profile
  PROFILE: 'Profile',
  EDIT_PROFILE: 'EditProfile',
  SUBSCRIPTION: 'Subscription',
  YEAR_IN_CIRCLES: 'YearInCircles',
  SETTINGS: 'Settings',
} as const;

export type RouteName = (typeof Routes)[keyof typeof Routes];
