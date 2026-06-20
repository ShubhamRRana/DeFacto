# Room for improvement

## These are the points i found that can be improved.

1. No error boundary / global error handling — AppNavigator and screens have scattered try/catch but no app-wide crash recovery.

2. TopicPicker is a hard gate with no skip option — if AI generation fails or a user has zero interests, they're stuck before reaching the app. 
    a. Solution: If no interest is selected, then give the option to user to "Choose All". But don't skip the TopicPicker page

3. Feed useEffect syncing refs from state (lines 46-60 in FeedScreen.js) is a sign the rabbit-hole/main-feed state machine has grown complex — worth consolidating into a reducer if more modes get added.

4. No tests — no __tests__ dir or testing library in package.json. For an app this interactive (gestures, async feed loading, quiz scoring), even light unit coverage on hooks (useFeed, useQuiz, useStreak) would catch regressions early.

5. No analytics/telemetry — can't tell what topics/quizzes are actually engaging users.

6. No offline/cached state — feed and bookmarks likely require a live connection every time; a local cache would help perceived performance and offline bookmarklist viewing.
    a. Solution : For every user the bookmarked facts should be available offline also. So save the user wise facts in their database.

7. AI generation cost/latency exposure — feed and rabbit-hole both call generation functions live in the UI thread of interaction; no visible rate-limiting or caching of previously-generated facts per topic (could mean duplicate AI spend for similar requests across users).