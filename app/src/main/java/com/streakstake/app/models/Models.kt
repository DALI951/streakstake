package com.streakstake.app.models

data class User(
    val id: String,
    var name: String,
    var email: String,
    var username: String = "",
    val uniqueCode: String, // 8-character alphanumeric + symbols (e.g. K9#mX2!a)
    val linkedProviders: MutableList<String> = mutableListOf("google"),
    var googleId: String? = null,
    var facebookId: String? = null,
    var totalXp: Int = 500,
    var currentStreak: Int = 0,
    var bestStreak: Int = 0,
    var challengesCompleted: Int = 0,
    var challengesFailed: Int = 0,
    var friendsList: MutableList<String> = mutableListOf(),
    val dismissedSuggestions: MutableList<String> = mutableListOf()
)

object StakeStatus {
    const val ACTIVE = "ACTIVE"
    const val PENDING_VERIFICATION = "PENDING_VERIFICATION"
    const val VERIFIED = "VERIFIED"
    const val BURNED = "BURNED"
}

data class Stake(
    val id: String,
    val creatorId: String = "",
    val creatorName: String = "",
    val creatorHandle: String = "",
    var title: String,
    var challengeType: String = "REPS", // REPS, DISTANCE, TIME, CUSTOM
    var targetValue: Int = 100,         // Target count (e.g. 100 reps, 2500m, 30 mins)
    var currentValue: Int = 0,          // Current logged count
    var unit: String = "reps",          // reps, meters, mins, steps
    var targetMeters: Int = 0,          // Backwards compatibility for walking
    var currentMeters: Int = 0,
    var stepsCount: Int = 0,
    val stakeXp: Int,
    val multiplier: Double = 1.5,
    var status: String = StakeStatus.ACTIVE,
    val deadlineMillis: Long = System.currentTimeMillis() + (4 * 3600 * 1000L), // Default 4 hours countdown
    var proofPhotoPath: String? = null,
    var proofNote: String? = null,
    var verifiedBy: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    var completedAt: Long = 0L
) {
    val isCompleted: Boolean
        get() = status == StakeStatus.VERIFIED

    val isPending: Boolean
        get() = status == StakeStatus.PENDING_VERIFICATION

    val isBurned: Boolean
        get() = status == StakeStatus.BURNED
}

data class FriendRequest(
    val id: String,
    val fromUserId: String,
    val fromUserName: String,
    val fromUserHandle: String,
    val toUserId: String,
    var fromUserAvatar: String = "",
    var status: String = "PENDING", // PENDING, ACCEPTED, DECLINED
    val createdAt: Long = System.currentTimeMillis()
)

data class AppNotification(
    val id: String,
    val userId: String,
    val title: String,
    val message: String,
    val type: String = "INFO",
    val timestamp: Long = System.currentTimeMillis(),
    var isRead: Boolean = false
)

data class Friend(
    val id: String,
    val name: String,
    val username: String,
    val uniqueCode: String,
    var totalXp: Int,
    var streak: Int,
    var isOnline: Boolean = true
)

data class SocialFeedItem(
    val id: String,
    val userId: String,
    val userName: String,
    val actionType: String,
    val description: String,
    val xpAmount: Int,
    val timestamp: Long = System.currentTimeMillis()
)

data class GitHubRelease(
    val tag_name: String,
    val name: String?,
    val body: String?,
    val html_url: String?,
    val assets: List<GitHubAsset>?
)

data class GitHubAsset(
    val name: String,
    val size: Long,
    val browser_download_url: String
)
