package com.streakstake.app.models

data class User(
    val id: String,
    val name: String,
    val email: String,
    var username: String = "",
    var totalXp: Int = 500,
    var currentStreak: Int = 0,
    var bestStreak: Int = 0,
    var challengesCompleted: Int = 0,
    var challengesFailed: Int = 0,
    val friendsList: MutableList<String> = mutableListOf()
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
    val title: String,
    val targetMeters: Int,
    var currentMeters: Int = 0,
    var stepsCount: Int = 0,
    val stakeXp: Int,
    val multiplier: Double = 1.5,
    var status: String = StakeStatus.ACTIVE,
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

data class SocialFeedItem(
    val id: String,
    val userId: String,
    val userName: String,
    val actionType: String,
    val description: String,
    val xpAmount: Int,
    val timestamp: Long = System.currentTimeMillis()
)

data class Friend(
    val id: String,
    val name: String,
    val username: String,
    var totalXp: Int,
    var streak: Int,
    var isOnline: Boolean = true
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
