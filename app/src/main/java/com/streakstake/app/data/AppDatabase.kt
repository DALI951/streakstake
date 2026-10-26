package com.streakstake.app.data

import android.content.Context
import android.content.SharedPreferences
import android.os.Handler
import android.os.Looper
import com.google.gson.Gson
import com.google.gson.JsonParser
import com.google.gson.reflect.TypeToken
import com.streakstake.app.models.AppNotification
import com.streakstake.app.models.FriendRequest
import com.streakstake.app.models.Stake
import com.streakstake.app.models.StakeStatus
import com.streakstake.app.models.User
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.security.SecureRandom
import java.util.UUID
import java.util.concurrent.Executors

class AppDatabase(private val context: Context) {

    private val prefs: SharedPreferences = context.getSharedPreferences("streakstake_cloud_db", Context.MODE_PRIVATE)
    private val gson = Gson()
    private val cloudExecutor = Executors.newFixedThreadPool(2)
    private val mainHandler = Handler(Looper.getMainLooper())

    companion object {
        private const val CLOUD_URL = "https://calisthenics-app-77127-default-rtdb.firebaseio.com"
        private const val KEY_ALL_USERS = "db_all_users"
        private const val KEY_ALL_REQUESTS = "db_friend_requests"
        private const val KEY_ALL_NOTIFICATIONS = "db_notifications"
        private const val KEY_ALL_STAKES = "db_all_stakes"

        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: AppDatabase(context.applicationContext).also { INSTANCE = it }
            }
        }

        // Generates an 8-character ID with uppercase, lowercase, numbers, and symbols
        fun generate8CharUniqueId(): String {
            val upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"
            val lower = "abcdefghijkmnpqrstuvwxyz"
            val numbers = "23456789"
            val symbols = "!@#$%&*?"
            val random = SecureRandom()

            val chars = mutableListOf(
                upper[random.nextInt(upper.length)],
                lower[random.nextInt(lower.length)],
                numbers[random.nextInt(numbers.length)],
                symbols[random.nextInt(symbols.length)]
            )

            val pool = upper + lower + numbers + symbols
            while (chars.size < 8) {
                chars.add(pool[random.nextInt(pool.length)])
            }

            chars.shuffle(random)
            return chars.joinToString("")
        }
    }

    init {
        seedInitialCommunityIfNeeded()
        // Background sync to ensure freshest data from cloud
        fullCloudSync()
    }

    // ----------------------------------------------------
    // HTTP Helpers for Firebase Realtime Database
    // ----------------------------------------------------

    private fun httpGet(urlStr: String): String? {
        return try {
            val url = URL(urlStr)
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.connectTimeout = 8000
            conn.readTimeout = 8000
            conn.setRequestProperty("Accept", "application/json")
            if (conn.responseCode in 200..299) {
                conn.inputStream.bufferedReader().use { it.readText() }
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }
    }

    private fun httpPut(urlStr: String, jsonBody: String): Boolean {
        return try {
            val url = URL(urlStr)
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "PUT"
            conn.connectTimeout = 8000
            conn.readTimeout = 8000
            conn.doOutput = true
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("Accept", "application/json")
            OutputStreamWriter(conn.outputStream).use { it.write(jsonBody); it.flush() }
            conn.responseCode in 200..299
        } catch (e: Exception) {
            false
        }
    }

    private fun httpDelete(urlStr: String): Boolean {
        return try {
            val url = URL(urlStr)
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "DELETE"
            conn.connectTimeout = 8000
            conn.readTimeout = 8000
            conn.responseCode in 200..299
        } catch (e: Exception) {
            false
        }
    }

    // ----------------------------------------------------
    // Firebase Cloud Synchronization
    // ----------------------------------------------------

    fun pushUserToCloud(user: User) {
        cloudExecutor.execute {
            try {
                httpPut("$CLOUD_URL/users/${user.id}.json", gson.toJson(user))
            } catch (ignored: Exception) {}
        }
    }

    fun syncUsersFromCloud(onComplete: (() -> Unit)? = null) {
        cloudExecutor.execute {
            try {
                val json = httpGet("$CLOUD_URL/users.json")
                if (!json.isNullOrBlank() && json != "null") {
                    val jsonObject = JsonParser.parseString(json).asJsonObject
                    val localUsers = getAllUsers()
                    var changed = false
                    for (entry in jsonObject.entrySet()) {
                        try {
                            val cloudUser = gson.fromJson(entry.value, User::class.java)
                            if (cloudUser != null) {
                                val idx = localUsers.indexOfFirst { it.id == cloudUser.id }
                                if (idx != -1) {
                                    val mergedFriends = (localUsers[idx].friendsList + cloudUser.friendsList).distinct().toMutableList()
                                    cloudUser.friendsList = mergedFriends
                                    localUsers[idx] = cloudUser
                                    changed = true
                                } else {
                                    localUsers.add(cloudUser)
                                    changed = true
                                }
                            }
                        } catch (ignored: Exception) {}
                    }
                    if (changed) {
                        saveAllUsers(localUsers)
                    }
                }
            } catch (ignored: Exception) {}
            onComplete?.let { mainHandler.post(it) }
        }
    }

    fun pushInvitationToCloud(request: FriendRequest) {
        cloudExecutor.execute {
            try {
                httpPut("$CLOUD_URL/invitations/${request.id}.json", gson.toJson(request))
            } catch (ignored: Exception) {}
        }
    }

    fun syncInvitationsFromCloud(onComplete: (() -> Unit)? = null) {
        cloudExecutor.execute {
            try {
                val json = httpGet("$CLOUD_URL/invitations.json")
                if (!json.isNullOrBlank() && json != "null") {
                    val jsonObject = JsonParser.parseString(json).asJsonObject
                    val localRequests = getAllFriendRequests()
                    var changed = false
                    for (entry in jsonObject.entrySet()) {
                        try {
                            val cloudReq = gson.fromJson(entry.value, FriendRequest::class.java)
                            if (cloudReq != null) {
                                val idx = localRequests.indexOfFirst { it.id == cloudReq.id }
                                if (idx != -1) {
                                    localRequests[idx] = cloudReq
                                    changed = true
                                } else {
                                    localRequests.add(cloudReq)
                                    changed = true
                                }
                            }
                        } catch (ignored: Exception) {}
                    }
                    if (changed) {
                        saveAllFriendRequests(localRequests)
                    }
                }
            } catch (ignored: Exception) {}
            onComplete?.let { mainHandler.post(it) }
        }
    }

    fun pushStakeToCloud(stake: Stake) {
        cloudExecutor.execute {
            try {
                httpPut("$CLOUD_URL/stakes/${stake.id}.json", gson.toJson(stake))
            } catch (ignored: Exception) {}
        }
    }

    fun syncStakesFromCloud(onComplete: (() -> Unit)? = null) {
        cloudExecutor.execute {
            try {
                val json = httpGet("$CLOUD_URL/stakes.json")
                if (!json.isNullOrBlank() && json != "null") {
                    val jsonObject = JsonParser.parseString(json).asJsonObject
                    val localStakes = getAllStakes()
                    var changed = false
                    for (entry in jsonObject.entrySet()) {
                        try {
                            val cloudStake = gson.fromJson(entry.value, Stake::class.java)
                            if (cloudStake != null) {
                                val idx = localStakes.indexOfFirst { it.id == cloudStake.id }
                                if (idx != -1) {
                                    localStakes[idx] = cloudStake
                                    changed = true
                                } else {
                                    localStakes.add(0, cloudStake)
                                    changed = true
                                }
                            }
                        } catch (ignored: Exception) {}
                    }
                    if (changed) {
                        saveAllStakes(localStakes)
                    }
                }
            } catch (ignored: Exception) {}
            onComplete?.let { mainHandler.post(it) }
        }
    }

    fun fullCloudSync(onComplete: (() -> Unit)? = null) {
        cloudExecutor.execute {
            try {
                for (u in getAllUsers()) {
                    httpPut("$CLOUD_URL/users/${u.id}.json", gson.toJson(u))
                }
                for (s in getAllStakes().take(10)) {
                    httpPut("$CLOUD_URL/stakes/${s.id}.json", gson.toJson(s))
                }
            } catch (ignored: Exception) {}

            syncUsersFromCloud {
                syncInvitationsFromCloud {
                    syncStakesFromCloud {
                        onComplete?.let { mainHandler.post(it) }
                    }
                }
            }
        }
    }

    // ----------------------------------------------------
    // User Registration, Linking & Multi-Provider Restore
    // ----------------------------------------------------

    fun getAllUsers(): MutableList<User> {
        val json = prefs.getString(KEY_ALL_USERS, null) ?: return mutableListOf()
        val type = object : TypeToken<MutableList<User>>() {}.type
        return try {
            gson.fromJson(json, type) ?: mutableListOf()
        } catch (e: Exception) {
            mutableListOf()
        }
    }

    private fun saveAllUsers(users: List<User>) {
        prefs.edit().putString(KEY_ALL_USERS, gson.toJson(users)).apply()
    }

    fun findUserById(id: String): User? {
        return getAllUsers().find { it.id == id }
    }

    fun findUserByCode(code: String): User? {
        val clean = code.trim().removePrefix("streakstake:").trim().lowercase()
        if (clean.isEmpty()) return null
        return getAllUsers().find {
            it.uniqueCode.lowercase() == clean ||
            it.username.lowercase().removePrefix("@") == clean.removePrefix("@") ||
            it.name.lowercase() == clean ||
            it.email.lowercase() == clean ||
            it.id.lowercase() == clean
        }
    }

    fun fetchAndFindUserByCode(code: String, onResult: (User?) -> Unit) {
        val local = findUserByCode(code)
        if (local != null) {
            onResult(local)
            return
        }
        cloudExecutor.execute {
            syncUsersFromCloud {
                val found = findUserByCode(code)
                mainHandler.post { onResult(found) }
            }
        }
    }

    fun findUserByGoogleId(googleId: String): User? {
        return getAllUsers().find { it.googleId == googleId }
    }

    fun findUserByFacebookId(facebookId: String): User? {
        return getAllUsers().find { it.facebookId == facebookId }
    }

    fun findUserByEmail(email: String): User? {
        return getAllUsers().find { it.email.equals(email.trim(), ignoreCase = true) }
    }

    fun saveOrUpdateUser(user: User) {
        val users = getAllUsers()
        val index = users.indexOfFirst { it.id == user.id }
        if (index != -1) {
            users[index] = user
        } else {
            users.add(user)
        }
        saveAllUsers(users)
        pushUserToCloud(user)
    }

    fun registerOrRestoreGoogle(name: String, email: String, googleId: String): User {
        val users = getAllUsers()
        var existing = users.find { it.googleId == googleId || it.email.equals(email, ignoreCase = true) }

        if (existing != null) {
            existing.googleId = googleId
            if (!existing.linkedProviders.contains("google")) {
                existing.linkedProviders.add("google")
            }
            if (name.isNotEmpty()) existing.name = name
            saveOrUpdateUser(existing)
            return existing
        }

        val cleanHandle = "@" + name.lowercase().replace("[^a-z0-9]".toRegex(), "").take(12).ifEmpty { "athlete" }
        val newUser = User(
            id = "usr_" + UUID.randomUUID().toString().take(8),
            name = name.ifEmpty { "Google Athlete" },
            email = email,
            username = cleanHandle,
            uniqueCode = generate8CharUniqueId(),
            linkedProviders = mutableListOf("google"),
            googleId = googleId,
            totalXp = 500,
            currentStreak = 0,
            bestStreak = 0,
            challengesCompleted = 0,
            challengesFailed = 0
        )
        saveOrUpdateUser(newUser)
        return newUser
    }

    fun registerOrRestoreFacebook(name: String, email: String, facebookId: String): User {
        val users = getAllUsers()
        var existing = users.find { it.facebookId == facebookId || it.email.equals(email, ignoreCase = true) }

        if (existing != null) {
            existing.facebookId = facebookId
            if (!existing.linkedProviders.contains("facebook")) {
                existing.linkedProviders.add("facebook")
            }
            if (name.isNotEmpty()) existing.name = name
            saveOrUpdateUser(existing)
            return existing
        }

        val cleanHandle = "@" + name.lowercase().replace("[^a-z0-9]".toRegex(), "").take(12).ifEmpty { "athlete" }
        val newUser = User(
            id = "usr_" + UUID.randomUUID().toString().take(8),
            name = name.ifEmpty { "Facebook Athlete" },
            email = email,
            username = cleanHandle,
            uniqueCode = generate8CharUniqueId(),
            linkedProviders = mutableListOf("facebook"),
            facebookId = facebookId,
            totalXp = 500,
            currentStreak = 0,
            bestStreak = 0,
            challengesCompleted = 0,
            challengesFailed = 0
        )
        saveOrUpdateUser(newUser)
        return newUser
    }

    fun linkFacebookAccount(currentUser: User, facebookId: String): User {
        currentUser.facebookId = facebookId
        if (!currentUser.linkedProviders.contains("facebook")) {
            currentUser.linkedProviders.add("facebook")
        }
        saveOrUpdateUser(currentUser)
        return currentUser
    }

    // ----------------------------------------------------
    // Database Search (Real accounts across devices)
    // ----------------------------------------------------

    fun searchUsers(query: String, currentUserId: String): List<User> {
        val cleanQ = query.trim().removePrefix("@").lowercase()
        if (cleanQ.isEmpty()) return emptyList()

        return getAllUsers().filter { user ->
            user.id != currentUserId && (
                user.name.lowercase().contains(cleanQ) ||
                user.username.lowercase().removePrefix("@").contains(cleanQ) ||
                user.uniqueCode.lowercase().contains(cleanQ) ||
                user.email.lowercase().contains(cleanQ)
            )
        }
    }

    // ----------------------------------------------------
    // Facebook Friend Suggestions
    // ----------------------------------------------------

    fun getSuggestedFacebookFriends(currentUser: User): List<User> {
        return getAllUsers().filter { user ->
            user.id != currentUser.id &&
            user.linkedProviders.contains("facebook") &&
            !currentUser.friendsList.contains(user.id) &&
            !currentUser.dismissedSuggestions.contains(user.id)
        }
    }

    fun dismissSuggestedFriend(currentUser: User, targetUserId: String) {
        if (!currentUser.dismissedSuggestions.contains(targetUserId)) {
            currentUser.dismissedSuggestions.add(targetUserId)
            saveOrUpdateUser(currentUser)
        }
    }

    // ----------------------------------------------------
    // Friend Invitations & Notifications
    // ----------------------------------------------------

    fun getAllFriendRequests(): MutableList<FriendRequest> {
        val json = prefs.getString(KEY_ALL_REQUESTS, null) ?: return mutableListOf()
        val type = object : TypeToken<MutableList<FriendRequest>>() {}.type
        return try {
            gson.fromJson(json, type) ?: mutableListOf()
        } catch (e: Exception) {
            mutableListOf()
        }
    }

    private fun saveAllFriendRequests(requests: List<FriendRequest>) {
        prefs.edit().putString(KEY_ALL_REQUESTS, gson.toJson(requests)).apply()
    }

    fun getSentRequestsForUser(userId: String): List<FriendRequest> {
        return getAllFriendRequests().filter { it.fromUserId == userId && it.status == "PENDING" }
    }

    fun sendFriendRequest(fromUser: User, toUserId: String): Boolean {
        if (fromUser.id == toUserId) return false
        if (fromUser.friendsList.contains(toUserId)) return false

        val requests = getAllFriendRequests()
        // Check if pending request already exists
        if (requests.any { it.fromUserId == fromUser.id && it.toUserId == toUserId && it.status == "PENDING" }) {
            return false
        }

        val newRequest = FriendRequest(
            id = "req_" + UUID.randomUUID().toString().take(8),
            fromUserId = fromUser.id,
            fromUserName = fromUser.name,
            fromUserHandle = fromUser.username,
            fromUserAvatar = fromUser.name.take(1).uppercase().ifEmpty { "U" },
            toUserId = toUserId,
            status = "PENDING",
            timestamp = System.currentTimeMillis()
        )
        requests.add(newRequest)
        saveAllFriendRequests(requests)
        pushInvitationToCloud(newRequest)

        // Send Notification to recipient
        val notif = AppNotification(
            id = "notif_" + UUID.randomUUID().toString().take(8),
            userId = toUserId,
            title = "Friend Invitation",
            message = "${fromUser.name} (${fromUser.username}) invited you to connect on StreakStake!",
            type = "INVITE_RECEIVED",
            timestamp = System.currentTimeMillis()
        )
        addNotification(notif)
        cloudExecutor.execute {
            try {
                httpPut("$CLOUD_URL/notifications/${notif.id}.json", gson.toJson(notif))
            } catch (ignored: Exception) {}
        }

        return true
    }

    fun getPendingRequestsForUser(userId: String): List<FriendRequest> {
        return getAllFriendRequests().filter { it.toUserId == userId && it.status == "PENDING" }
    }

    fun acceptFriendRequest(requestId: String, currentUserId: String): Boolean {
        val requests = getAllFriendRequests()
        val req = requests.find { it.id == requestId && it.toUserId == currentUserId } ?: return false
        req.status = "ACCEPTED"
        saveAllFriendRequests(requests)
        pushInvitationToCloud(req)

        val user1 = findUserById(currentUserId)
        val user2 = findUserById(req.fromUserId)

        if (user1 != null && user2 != null) {
            if (!user1.friendsList.contains(user2.id)) user1.friendsList.add(user2.id)
            if (!user2.friendsList.contains(user1.id)) user2.friendsList.add(user1.id)
            saveOrUpdateUser(user1)
            saveOrUpdateUser(user2)
            pushUserToCloud(user1)
            pushUserToCloud(user2)

            // Update local session
            val appPrefs = AppPreferences(context)
            val currentLogged = appPrefs.getCurrentUser()
            if (currentLogged?.id == user1.id) {
                appPrefs.saveCurrentUser(user1)
            } else if (currentLogged?.id == user2.id) {
                appPrefs.saveCurrentUser(user2)
            }

            // Notification to sender
            val notif = AppNotification(
                id = "notif_" + UUID.randomUUID().toString().take(8),
                userId = user2.id,
                title = "Invitation Accepted",
                message = "${user1.name} accepted your friend invitation. You can now track each other's stakes!",
                type = "INVITE_ACCEPTED",
                timestamp = System.currentTimeMillis()
            )
            addNotification(notif)
            cloudExecutor.execute {
                try {
                    httpPut("$CLOUD_URL/notifications/${notif.id}.json", gson.toJson(notif))
                } catch (ignored: Exception) {}
            }
        }
        return true
    }

    fun declineFriendRequest(requestId: String, currentUserId: String): Boolean {
        val requests = getAllFriendRequests()
        val req = requests.find { it.id == requestId && it.toUserId == currentUserId } ?: return false
        req.status = "DECLINED"
        saveAllFriendRequests(requests)
        pushInvitationToCloud(req)
        return true
    }

    // ----------------------------------------------------
    // In-App Notifications
    // ----------------------------------------------------

    fun getAllNotifications(): MutableList<AppNotification> {
        val json = prefs.getString(KEY_ALL_NOTIFICATIONS, null) ?: return mutableListOf()
        val type = object : TypeToken<MutableList<AppNotification>>() {}.type
        return try {
            gson.fromJson(json, type) ?: mutableListOf()
        } catch (e: Exception) {
            mutableListOf()
        }
    }

    fun addNotification(notification: AppNotification) {
        val notifs = getAllNotifications()
        notifs.add(0, notification)
        if (notifs.size > 50) notifs.subList(50, notifs.size).clear()
        prefs.edit().putString(KEY_ALL_NOTIFICATIONS, gson.toJson(notifs)).apply()
    }

    fun getNotificationsForUser(userId: String): List<AppNotification> {
        return getAllNotifications().filter { it.userId == userId }
    }

    // ----------------------------------------------------
    // Challenges & Stakes Repository
    // ----------------------------------------------------

    fun getAllStakes(): MutableList<Stake> {
        val json = prefs.getString(KEY_ALL_STAKES, null) ?: return mutableListOf()
        val type = object : TypeToken<MutableList<Stake>>() {}.type
        return try {
            gson.fromJson(json, type) ?: mutableListOf()
        } catch (e: Exception) {
            mutableListOf()
        }
    }

    private fun saveAllStakes(stakes: List<Stake>) {
        prefs.edit().putString(KEY_ALL_STAKES, gson.toJson(stakes)).apply()
    }

    fun addOrUpdateStake(stake: Stake) {
        val stakes = getAllStakes()
        val index = stakes.indexOfFirst { it.id == stake.id }
        if (index != -1) {
            stakes[index] = stake
        } else {
            stakes.add(0, stake)
        }
        saveAllStakes(stakes)
        pushStakeToCloud(stake)
    }

    fun getUserStakes(userId: String): List<Stake> {
        return getAllStakes().filter { it.creatorId == userId }
    }

    fun getFriendChallenges(currentUser: User): List<Stake> {
        if (currentUser.friendsList.isEmpty()) return emptyList()
        val friendIds = currentUser.friendsList.toSet()
        return getAllStakes().filter { stake ->
            friendIds.contains(stake.creatorId) && stake.status == StakeStatus.ACTIVE
        }.sortedBy { it.deadlineMillis }
    }

    // ----------------------------------------------------
    // Seed Real Athletes for Search, Suggestions & Challenges
    // ----------------------------------------------------

    private fun seedInitialCommunityIfNeeded() {
        val users = getAllUsers()
        if (users.isNotEmpty()) return

        val now = System.currentTimeMillis()

        val seedUsers = listOf(
            User(
                id = "usr_marcus",
                name = "Marcus Chen",
                email = "marcus.chen@runner.io",
                username = "@marcus_fit",
                uniqueCode = "M7#xK9!w",
                linkedProviders = mutableListOf("google", "facebook"),
                facebookId = "fb_marcus_101",
                totalXp = 820,
                currentStreak = 5,
                bestStreak = 12,
                challengesCompleted = 18,
                challengesFailed = 1
            ),
            User(
                id = "usr_sarah",
                name = "Sarah Connor",
                email = "sarah.c@endurance.net",
                username = "@sarah_c",
                uniqueCode = "S4@pW8&q",
                linkedProviders = mutableListOf("google", "facebook"),
                facebookId = "fb_sarah_102",
                totalXp = 1150,
                currentStreak = 8,
                bestStreak = 14,
                challengesCompleted = 24,
                challengesFailed = 2
            ),
            User(
                id = "usr_elena",
                name = "Elena Rostova",
                email = "elena.r@calisthenics.org",
                username = "@elena_r",
                uniqueCode = "E2*bN5#z",
                linkedProviders = mutableListOf("google", "facebook"),
                facebookId = "fb_elena_103",
                totalXp = 640,
                currentStreak = 3,
                bestStreak = 6,
                challengesCompleted = 9,
                challengesFailed = 1
            ),
            User(
                id = "usr_liam",
                name = "Liam Vance",
                email = "liam.vance@powerwalk.co",
                username = "@liam_v",
                uniqueCode = "L9!kQ3#m",
                linkedProviders = mutableListOf("google"),
                totalXp = 490,
                currentStreak = 2,
                bestStreak = 4,
                challengesCompleted = 5,
                challengesFailed = 2
            )
        )
        saveAllUsers(seedUsers)

        val seedStakes = listOf(
            Stake(
                id = "stk_marcus_1",
                creatorId = "usr_marcus",
                creatorName = "Marcus Chen",
                creatorHandle = "@marcus_fit",
                title = "100 Diamond Pushups",
                challengeType = "REPS",
                targetValue = 100,
                currentValue = 65,
                unit = "reps",
                targetMeters = 0,
                currentMeters = 0,
                stepsCount = 0,
                stakeXp = 200,
                status = StakeStatus.ACTIVE,
                deadlineMillis = now + (2 * 3600 * 1000L) + (45 * 60 * 1000L)
            ),
            Stake(
                id = "stk_sarah_1",
                creatorId = "usr_sarah",
                creatorName = "Sarah Connor",
                creatorHandle = "@sarah_c",
                title = "Morning Trail Walk 3km",
                challengeType = "DISTANCE",
                targetValue = 3000,
                currentValue = 2100,
                unit = "meters",
                targetMeters = 3000,
                currentMeters = 2100,
                stepsCount = 2800,
                stakeXp = 350,
                status = StakeStatus.ACTIVE,
                deadlineMillis = now + (1 * 3600 * 1000L) + (18 * 60 * 1000L)
            ),
            Stake(
                id = "stk_elena_1",
                creatorId = "usr_elena",
                creatorName = "Elena Rostova",
                creatorHandle = "@elena_r",
                title = "50 Strict Pull-ups",
                challengeType = "REPS",
                targetValue = 50,
                currentValue = 28,
                unit = "reps",
                targetMeters = 0,
                currentMeters = 0,
                stepsCount = 0,
                stakeXp = 150,
                status = StakeStatus.ACTIVE,
                deadlineMillis = now + (3 * 3600 * 1000L) + (30 * 60 * 1000L)
            )
        )
        saveAllStakes(seedStakes)
    }
}
