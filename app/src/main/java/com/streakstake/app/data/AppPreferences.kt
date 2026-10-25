package com.streakstake.app.data

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.streakstake.app.models.Friend
import com.streakstake.app.models.SocialFeedItem
import com.streakstake.app.models.Stake
import com.streakstake.app.models.StakeStatus
import com.streakstake.app.models.User
import java.util.UUID

class AppPreferences(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("streakstake_prefs", Context.MODE_PRIVATE)
    private val gson = Gson()

    companion object {
        private const val KEY_CURRENT_USER = "current_user"
        private const val KEY_STAKES = "active_stakes"
        private const val KEY_PEER_STAKES = "peer_pending_stakes"
        private const val KEY_SOCIAL_FEED = "social_feed"
        private const val KEY_FRIENDS = "friends_list"
        private const val KEY_GPS_ENABLED = "setting_gps_enabled"
        private const val KEY_HAPTIC_ENABLED = "setting_haptic_enabled"
        private const val KEY_AUTO_UPDATE_ENABLED = "setting_auto_update"
    }

    // --- User Session ---
    fun getCurrentUser(): User? {
        val json = prefs.getString(KEY_CURRENT_USER, null) ?: return null
        return try {
            gson.fromJson(json, User::class.java)
        } catch (e: Exception) {
            null
        }
    }

    fun saveCurrentUser(user: User?) {
        if (user == null) {
            prefs.edit().remove(KEY_CURRENT_USER).apply()
        } else {
            prefs.edit().putString(KEY_CURRENT_USER, gson.toJson(user)).apply()
        }
    }

    fun updateAccountDetails(name: String, username: String) {
        val user = getCurrentUser() ?: return
        val updated = user.copy(
            name = name,
            username = if (username.startsWith("@")) username else "@$username"
        )
        saveCurrentUser(updated)
    }

    // --- Settings Preferences ---
    fun isGpsEnabled(): Boolean = prefs.getBoolean(KEY_GPS_ENABLED, true)
    fun setGpsEnabled(enabled: Boolean) = prefs.edit().putBoolean(KEY_GPS_ENABLED, enabled).apply()

    fun isHapticEnabled(): Boolean = prefs.getBoolean(KEY_HAPTIC_ENABLED, true)
    fun setHapticEnabled(enabled: Boolean) = prefs.edit().putBoolean(KEY_HAPTIC_ENABLED, enabled).apply()

    fun isAutoUpdateEnabled(): Boolean = prefs.getBoolean(KEY_AUTO_UPDATE_ENABLED, true)
    fun setAutoUpdateEnabled(enabled: Boolean) = prefs.edit().putBoolean(KEY_AUTO_UPDATE_ENABLED, enabled).apply()

    fun resetAccountData() {
        val user = getCurrentUser()
        if (user != null) {
            val freshUser = user.copy(
                totalXp = 500,
                currentStreak = 0,
                bestStreak = 0,
                challengesCompleted = 0,
                challengesFailed = 0
            )
            saveCurrentUser(freshUser)
        }
        prefs.edit()
            .remove(KEY_STAKES)
            .remove(KEY_PEER_STAKES)
            .remove(KEY_SOCIAL_FEED)
            .apply()
    }

    // --- My Stakes ---
    fun getStakes(): MutableList<Stake> {
        val json = prefs.getString(KEY_STAKES, null) ?: return mutableListOf()
        val type = object : TypeToken<MutableList<Stake>>() {}.type
        return try {
            gson.fromJson(json, type) ?: mutableListOf()
        } catch (e: Exception) {
            mutableListOf()
        }
    }

    fun saveStakes(stakes: List<Stake>) {
        prefs.edit().putString(KEY_STAKES, gson.toJson(stakes)).apply()
    }

    fun addStake(stake: Stake) {
        val current = getStakes()
        current.add(0, stake)
        saveStakes(current)

        // Post to Social Feed
        addSocialFeedItem(
            SocialFeedItem(
                id = "feed_" + UUID.randomUUID().toString().take(8),
                userId = stake.creatorId,
                userName = stake.creatorName.ifEmpty { "Challenger" },
                actionType = "STAKE_LOCKED",
                description = "Locked ${stake.stakeXp} XP on '${stake.title}' (${stake.targetMeters}m target)",
                xpAmount = stake.stakeXp
            )
        )
    }

    fun updateStake(stake: Stake) {
        val current = getStakes()
        val index = current.indexOfFirst { it.id == stake.id }
        if (index != -1) {
            current[index] = stake
            saveStakes(current)
        }
    }

    fun deleteStake(stakeId: String) {
        val current = getStakes()
        current.removeAll { it.id == stakeId }
        saveStakes(current)
    }

    // --- Peer Verification Queue ("Proof or Burn") ---
    fun getPeerPendingStakes(): MutableList<Stake> {
        val json = prefs.getString(KEY_PEER_STAKES, null) ?: return mutableListOf()
        val type = object : TypeToken<MutableList<Stake>>() {}.type
        return try {
            gson.fromJson(json, type) ?: mutableListOf()
        } catch (e: Exception) {
            mutableListOf()
        }
    }

    fun savePeerPendingStakes(stakes: List<Stake>) {
        prefs.edit().putString(KEY_PEER_STAKES, gson.toJson(stakes)).apply()
    }

    fun addPeerPendingStake(stake: Stake) {
        val current = getPeerPendingStakes()
        current.removeAll { it.id == stake.id }
        current.add(0, stake)
        savePeerPendingStakes(current)
    }

    fun removePeerPendingStake(stakeId: String) {
        val current = getPeerPendingStakes()
        current.removeAll { it.id == stakeId }
        savePeerPendingStakes(current)
    }

    // --- Social Activity Feed ---
    fun getSocialFeed(): MutableList<SocialFeedItem> {
        val json = prefs.getString(KEY_SOCIAL_FEED, null) ?: return mutableListOf()
        val type = object : TypeToken<MutableList<SocialFeedItem>>() {}.type
        return try {
            gson.fromJson(json, type) ?: mutableListOf()
        } catch (e: Exception) {
            mutableListOf()
        }
    }

    fun addSocialFeedItem(item: SocialFeedItem) {
        val feed = getSocialFeed()
        feed.add(0, item)
        if (feed.size > 50) {
            feed.subList(50, feed.size).clear()
        }
        prefs.edit().putString(KEY_SOCIAL_FEED, gson.toJson(feed)).apply()
    }

    // --- Friends Circle & Leaderboards ---
    fun getFriends(): MutableList<Friend> {
        val json = prefs.getString(KEY_FRIENDS, null) ?: return mutableListOf()
        val type = object : TypeToken<MutableList<Friend>>() {}.type
        return try {
            gson.fromJson(json, type) ?: mutableListOf()
        } catch (e: Exception) {
            mutableListOf()
        }
    }

    fun saveFriends(friends: List<Friend>) {
        prefs.edit().putString(KEY_FRIENDS, gson.toJson(friends)).apply()
    }

    fun addFriend(friend: Friend): Boolean {
        val current = getFriends()
        if (current.any { it.id == friend.id || it.username.equals(friend.username, ignoreCase = true) }) {
            return false
        }
        current.add(friend)
        saveFriends(current)

        val user = getCurrentUser()
        if (user != null && !user.friendsList.contains(friend.id)) {
            user.friendsList.add(friend.id)
            saveCurrentUser(user)
        }
        return true
    }

    fun removeFriend(friendId: String) {
        val current = getFriends()
        current.removeAll { it.id == friendId }
        saveFriends(current)

        val user = getCurrentUser()
        if (user != null) {
            user.friendsList.remove(friendId)
            saveCurrentUser(user)
        }
    }
}
