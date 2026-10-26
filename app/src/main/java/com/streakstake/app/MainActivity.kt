package com.streakstake.app

import android.app.AlertDialog
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.zxing.BarcodeFormat
import com.google.zxing.MultiFormatWriter
import com.streakstake.app.data.AppDatabase
import com.streakstake.app.data.AppPreferences
import com.streakstake.app.databinding.ActivityMainBinding
import com.streakstake.app.models.FriendRequest
import com.streakstake.app.models.Stake
import com.streakstake.app.models.StakeStatus
import com.streakstake.app.models.User
import java.util.UUID

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var prefs: AppPreferences
    private lateinit var db: AppDatabase
    private var currentUser: User? = null

    // Goal creation selection
    private var selectedMeters = 500
    private var selectedStakeXp = 100

    // Main Navigation: 0 = Home, 1 = Friends
    private var activeMainTab = 0

    // Friends Subtab: 0 = Friends, 1 = Invitations, 2 = Suggested
    private var activeFriendsSubTab = 0

    // Real-Time Countdown Timer Handler for Friend Challenges
    private val countdownHandler = Handler(Looper.getMainLooper())
    private val activeCountdownViews = mutableListOf<Pair<TextView, Long>>()

    private val countdownRunnable = object : Runnable {
        override fun run() {
            val now = System.currentTimeMillis()
            for ((tvTimer, deadline) in activeCountdownViews) {
                val diff = deadline - now
                if (diff <= 0) {
                    tvTimer.text = "TIME EXPIRED"
                    tvTimer.setTextColor(Color.parseColor("#F87171"))
                } else {
                    val hours = diff / (3600 * 1000)
                    val minutes = (diff % (3600 * 1000)) / (60 * 1000)
                    val seconds = (diff % (60 * 1000)) / 1000
                    tvTimer.text = String.format("%02dh %02dm %02ds", hours, minutes, seconds)
                }
            }
            countdownHandler.postDelayed(this, 1000)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = AppPreferences(this)
        db = AppDatabase.getInstance(this)

        currentUser = prefs.getCurrentUser()
        if (currentUser == null) {
            navigateToSignIn()
            return
        }

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupHeader()
        setupBottomNav()
        setupDistanceSelector()
        setupStakeSelector()
        setupGoalLocking()
        setupFriendsPage()
    }

    override fun onResume() {
        super.onResume()
        currentUser = prefs.getCurrentUser()
        if (currentUser == null) {
            navigateToSignIn()
            return
        }
        updateUserHeader()
        if (activeMainTab == 0) {
            renderHomePage()
        } else {
            renderFriendsPage()
        }
        startCountdownTimer()
    }

    override fun onPause() {
        super.onPause()
        stopCountdownTimer()
    }

    private fun startCountdownTimer() {
        stopCountdownTimer()
        countdownHandler.post(countdownRunnable)
    }

    private fun stopCountdownTimer() {
        countdownHandler.removeCallbacks(countdownRunnable)
    }

    // ----------------------------------------------------
    // User Header & Navigation
    // ----------------------------------------------------

    private fun setupHeader() {
        binding.btnSettings.setOnClickListener {
            val intent = Intent(this, SettingsActivity::class.java)
            startActivity(intent)
        }
    }

    private fun updateUserHeader() {
        currentUser?.let { user ->
            binding.tvUserName.text = user.name
            binding.tvUserHandle.text = user.username
            binding.tvAvatarInitial.text = user.name.take(1).uppercase()
            binding.tvXpBalance.text = "${user.totalXp} XP"
            binding.tvStreakCount.text = "${user.currentStreak} Days"
            binding.tvCompletedCount.text = "${user.challengesCompleted} Won"
        }
    }

    private fun setupBottomNav() {
        binding.navHome.setOnClickListener {
            selectMainTab(0)
        }
        binding.navFriends.setOnClickListener {
            selectMainTab(1)
        }
        selectMainTab(0)
    }

    private fun selectMainTab(tabIndex: Int) {
        activeMainTab = tabIndex

        val accent = ContextCompat.getColor(this, R.color.accent_light)
        val muted = ContextCompat.getColor(this, R.color.text_secondary)

        if (tabIndex == 0) {
            binding.layoutHomeTab.visibility = View.VISIBLE
            binding.layoutFriendsTab.visibility = View.GONE

            binding.ivNavHomeIcon.setColorFilter(accent)
            binding.tvNavHomeText.setTextColor(accent)

            binding.ivNavFriendsIcon.setColorFilter(muted)
            binding.tvNavFriendsText.setTextColor(muted)

            renderHomePage()
        } else {
            binding.layoutHomeTab.visibility = View.GONE
            binding.layoutFriendsTab.visibility = View.VISIBLE

            binding.ivNavHomeIcon.setColorFilter(muted)
            binding.tvNavHomeText.setTextColor(muted)

            binding.ivNavFriendsIcon.setColorFilter(accent)
            binding.tvNavFriendsText.setTextColor(accent)

            renderFriendsPage()
        }
    }

    // ----------------------------------------------------
    // TAB 1: HOME PAGE (TOP: YOUR GOAL, BOTTOM: FRIEND CHALLENGES)
    // ----------------------------------------------------

    private fun renderHomePage() {
        renderMyChallengeSection()
        renderFriendChallengesSection()
    }

    private fun renderMyChallengeSection() {
        val user = currentUser ?: return
        val activeStake = prefs.getStakes().find { it.status == StakeStatus.ACTIVE }

        if (activeStake != null) {
            // User has an active challenge in progress
            binding.layoutActiveStakeCard.visibility = View.VISIBLE
            binding.layoutGoalCreator.visibility = View.GONE

            binding.tvActiveStakeTitle.text = activeStake.title
            binding.tvActiveStakeXpBadge.text = "${activeStake.stakeXp} XP Locked"
            binding.pbActiveStakeProgress.max = activeStake.targetMeters
            binding.pbActiveStakeProgress.progress = activeStake.currentMeters
            binding.tvActiveStakeDistanceText.text = "${activeStake.currentMeters}m / ${activeStake.targetMeters}m target"
            binding.tvActiveStakeStepsText.text = "${activeStake.stepsCount} steps"

            binding.btnOpenWalkTracker.setOnClickListener {
                val intent = Intent(this, WalkTrackerActivity::class.java).apply {
                    putExtra(WalkTrackerActivity.EXTRA_STAKE_ID, activeStake.id)
                    putExtra(WalkTrackerActivity.EXTRA_TARGET_METERS, activeStake.targetMeters)
                    putExtra(WalkTrackerActivity.EXTRA_STAKE_XP, activeStake.stakeXp)
                }
                startActivity(intent)
            }
        } else {
            // Show goal setter
            binding.layoutActiveStakeCard.visibility = View.GONE
            binding.layoutGoalCreator.visibility = View.VISIBLE
        }
    }

    private fun renderFriendChallengesSection() {
        val user = currentUser ?: return
        activeCountdownViews.clear()
        binding.containerFriendChallenges.removeAllViews()

        val friendChallenges = db.getFriendChallenges(user)
        binding.tvFriendChallengesCount.text = "${friendChallenges.size} Active"

        if (friendChallenges.isEmpty()) {
            binding.layoutNoFriendChallenges.visibility = View.VISIBLE
            binding.btnGoToFriendsTab.setOnClickListener {
                selectMainTab(1)
            }
        } else {
            binding.layoutNoFriendChallenges.visibility = View.GONE

            val inflater = LayoutInflater.from(this)
            for (stake in friendChallenges) {
                val card = inflater.inflate(R.layout.item_friend_challenge, binding.containerFriendChallenges, false)

                val tvAvatar = card.findViewById<TextView>(R.id.tvFriendAvatar)
                val tvName = card.findViewById<TextView>(R.id.tvFriendName)
                val tvHandle = card.findViewById<TextView>(R.id.tvFriendHandle)
                val tvStakeXp = card.findViewById<TextView>(R.id.tvFriendStakeXp)
                val tvTitle = card.findViewById<TextView>(R.id.tvFriendChallengeTitle)
                val tvTarget = card.findViewById<TextView>(R.id.tvFriendTargetMeters)
                val tvTimer = card.findViewById<TextView>(R.id.tvFriendCountdownTimer)
                val tvPercent = card.findViewById<TextView>(R.id.tvFriendProgressPercent)

                tvAvatar.text = stake.creatorName.take(1).uppercase().ifEmpty { "A" }
                tvName.text = stake.creatorName
                tvHandle.text = stake.creatorHandle
                tvStakeXp.text = "${stake.stakeXp} XP"
                tvTitle.text = stake.title
                tvTarget.text = "Target: ${stake.targetMeters}m • 1.5x Multiplier"

                val progress = if (stake.targetMeters > 0) ((stake.currentMeters * 100) / stake.targetMeters).coerceIn(0, 100) else 0
                tvPercent.text = "$progress%"

                // Register countdown timer
                activeCountdownViews.add(Pair(tvTimer, stake.deadlineMillis))

                binding.containerFriendChallenges.addView(card)
            }
        }
    }

    private fun setupDistanceSelector() {
        val distButtons = listOf(
            Pair(binding.btnDist500, 500),
            Pair(binding.btnDist1000, 1000),
            Pair(binding.btnDist2500, 2500),
            Pair(binding.btnDist5000, 5000)
        )

        distButtons.forEach { (btn, distance) ->
            btn.setOnClickListener {
                selectedMeters = distance
                distButtons.forEach { (b, d) ->
                    if (d == distance) {
                        b.setBackgroundResource(R.drawable.bg_pill_chip_active)
                        b.setTextColor(ContextCompat.getColor(this, R.color.on_accent))
                    } else {
                        b.setBackgroundResource(R.drawable.bg_pill_chip)
                        b.setTextColor(ContextCompat.getColor(this, R.color.text_primary))
                    }
                }
            }
        }
    }

    private fun setupStakeSelector() {
        val stakeButtons = listOf(
            Pair(binding.btnStake50, 50),
            Pair(binding.btnStake100, 100),
            Pair(binding.btnStake250, 250),
            Pair(binding.btnStake500, 500)
        )

        stakeButtons.forEach { (btn, xp) ->
            btn.setOnClickListener {
                selectedStakeXp = xp
                stakeButtons.forEach { (b, x) ->
                    if (x == xp) {
                        b.setBackgroundResource(R.drawable.bg_pill_chip_active)
                        b.setTextColor(ContextCompat.getColor(this, R.color.on_accent))
                    } else {
                        b.setBackgroundResource(R.drawable.bg_pill_chip)
                        b.setTextColor(ContextCompat.getColor(this, R.color.text_primary))
                    }
                }
            }
        }
    }

    private fun setupGoalLocking() {
        binding.btnLockStake.setOnClickListener {
            val user = currentUser ?: return@setOnClickListener

            if (user.totalXp < selectedStakeXp) {
                Toast.makeText(this, "Insufficient XP! You need $selectedStakeXp XP to stake.", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            // Deduct XP immediately (The Staking Principle)
            user.totalXp -= selectedStakeXp
            prefs.saveCurrentUser(user)
            updateUserHeader()

            val stakeId = "stake_" + UUID.randomUUID().toString().take(8)
            val deadline = System.currentTimeMillis() + (4 * 3600 * 1000L) // 4 hours countdown
            val newStake = Stake(
                id = stakeId,
                creatorId = user.id,
                creatorName = user.name,
                creatorHandle = user.username,
                title = "Walk ${selectedMeters}m Target",
                targetMeters = selectedMeters,
                currentMeters = 0,
                stepsCount = 0,
                stakeXp = selectedStakeXp,
                multiplier = 1.5,
                status = StakeStatus.ACTIVE,
                deadlineMillis = deadline
            )

            prefs.addStake(newStake)
            Toast.makeText(this, "Locked $selectedStakeXp XP on ${selectedMeters}m Challenge!", Toast.LENGTH_SHORT).show()

            // Open Walk Tracker
            val intent = Intent(this, WalkTrackerActivity::class.java).apply {
                putExtra(WalkTrackerActivity.EXTRA_STAKE_ID, stakeId)
                putExtra(WalkTrackerActivity.EXTRA_TARGET_METERS, selectedMeters)
                putExtra(WalkTrackerActivity.EXTRA_STAKE_XP, selectedStakeXp)
            }
            startActivity(intent)
        }
    }

    // ----------------------------------------------------
    // TAB 2: FRIENDS PAGE (ADD, INVITATIONS, FACEBOOK SUGGESTIONS)
    // ----------------------------------------------------

    private fun setupFriendsPage() {
        binding.btnSubTabFriends.setOnClickListener { selectFriendsSubTab(0) }
        binding.btnSubTabInvitations.setOnClickListener { selectFriendsSubTab(1) }
        binding.btnSubTabSuggestions.setOnClickListener { selectFriendsSubTab(2) }

        binding.btnAddFriendModal.setOnClickListener {
            showAddFriendModal()
        }
    }

    private fun selectFriendsSubTab(subTabIndex: Int) {
        activeFriendsSubTab = subTabIndex

        val activeBg = R.drawable.bg_pill_chip_active
        val inactiveBg = R.drawable.bg_pill_chip
        val activeTextColor = ContextCompat.getColor(this, R.color.on_accent)
        val inactiveTextColor = ContextCompat.getColor(this, R.color.text_secondary)

        binding.btnSubTabFriends.setBackgroundResource(if (subTabIndex == 0) activeBg else inactiveBg)
        binding.btnSubTabFriends.setTextColor(if (subTabIndex == 0) activeTextColor else inactiveTextColor)

        binding.btnSubTabInvitations.setBackgroundResource(if (subTabIndex == 1) activeBg else inactiveBg)
        binding.btnSubTabInvitations.setTextColor(if (subTabIndex == 1) activeTextColor else inactiveTextColor)

        binding.btnSubTabSuggestions.setBackgroundResource(if (subTabIndex == 2) activeBg else inactiveBg)
        binding.btnSubTabSuggestions.setTextColor(if (subTabIndex == 2) activeTextColor else inactiveTextColor)

        binding.layoutSubFriends.visibility = if (subTabIndex == 0) View.VISIBLE else View.GONE
        binding.layoutSubInvitations.visibility = if (subTabIndex == 1) View.VISIBLE else View.GONE
        binding.layoutSubSuggestions.visibility = if (subTabIndex == 2) View.VISIBLE else View.GONE

        renderFriendsPage()
    }

    private fun renderFriendsPage() {
        val user = currentUser ?: return
        val pendingInvites = db.getPendingRequestsForUser(user.id)
        binding.btnSubTabInvitations.text = "Invites (${pendingInvites.size})"

        when (activeFriendsSubTab) {
            0 -> renderConfirmedFriendsList()
            1 -> renderInvitationsList(pendingInvites)
            2 -> renderFacebookSuggestions()
        }
    }

    private fun renderConfirmedFriendsList() {
        val user = currentUser ?: return
        binding.containerFriendsList.removeAllViews()

        val friendUsers = user.friendsList.mapNotNull { db.findUserById(it) }

        if (friendUsers.isEmpty()) {
            binding.tvEmptyFriends.visibility = View.VISIBLE
        } else {
            binding.tvEmptyFriends.visibility = View.GONE
            val inflater = LayoutInflater.from(this)

            for (friend in friendUsers) {
                val card = inflater.inflate(R.layout.item_friend_user, binding.containerFriendsList, false)
                val tvAvatar = card.findViewById<TextView>(R.id.tvUserAvatar)
                val tvName = card.findViewById<TextView>(R.id.tvFriendUserName)
                val tvHandle = card.findViewById<TextView>(R.id.tvFriendUserHandle)
                val tvXp = card.findViewById<TextView>(R.id.tvFriendUserXp)
                val tvStreak = card.findViewById<TextView>(R.id.tvFriendUserStreak)

                tvAvatar.text = friend.name.take(1).uppercase().ifEmpty { "A" }
                tvName.text = friend.name
                tvHandle.text = "${friend.username} • ID: ${friend.uniqueCode}"
                tvXp.text = "${friend.totalXp} XP"
                tvStreak.text = "${friend.currentStreak} Day Streak"

                binding.containerFriendsList.addView(card)
            }
        }
    }

    private fun renderInvitationsList(invites: List<FriendRequest>) {
        val user = currentUser ?: return
        binding.containerInvitationsList.removeAllViews()

        if (invites.isEmpty()) {
            binding.tvEmptyInvitations.visibility = View.VISIBLE
        } else {
            binding.tvEmptyInvitations.visibility = View.GONE
            val inflater = LayoutInflater.from(this)

            for (req in invites) {
                val card = inflater.inflate(R.layout.item_invitation, binding.containerInvitationsList, false)
                val tvAvatar = card.findViewById<TextView>(R.id.tvInviteAvatar)
                val tvName = card.findViewById<TextView>(R.id.tvInviteName)
                val tvHandle = card.findViewById<TextView>(R.id.tvInviteHandle)
                val btnAccept = card.findViewById<Button>(R.id.btnAcceptInvite)
                val btnDecline = card.findViewById<Button>(R.id.btnDeclineInvite)

                tvAvatar.text = req.fromUserName.take(1).uppercase().ifEmpty { "U" }
                tvName.text = req.fromUserName
                tvHandle.text = req.fromUserHandle

                btnAccept.setOnClickListener {
                    db.acceptFriendRequest(req.id, user.id)
                    currentUser = prefs.getCurrentUser()
                    Toast.makeText(this, "Accepted invitation from ${req.fromUserName}!", Toast.LENGTH_SHORT).show()
                    renderFriendsPage()
                }

                btnDecline.setOnClickListener {
                    db.declineFriendRequest(req.id, user.id)
                    Toast.makeText(this, "Declined invitation.", Toast.LENGTH_SHORT).show()
                    renderFriendsPage()
                }

                binding.containerInvitationsList.addView(card)
            }
        }
    }

    private fun renderFacebookSuggestions() {
        val user = currentUser ?: return
        binding.containerSuggestionsList.removeAllViews()

        val suggestions = db.getSuggestedFacebookFriends(user)

        if (suggestions.isEmpty()) {
            binding.tvEmptySuggestions.visibility = View.VISIBLE
        } else {
            binding.tvEmptySuggestions.visibility = View.GONE
            val inflater = LayoutInflater.from(this)

            for (suggested in suggestions) {
                val card = inflater.inflate(R.layout.item_facebook_suggestion, binding.containerSuggestionsList, false)
                val tvAvatar = card.findViewById<TextView>(R.id.tvSuggestionAvatar)
                val tvName = card.findViewById<TextView>(R.id.tvSuggestionName)
                val tvHandle = card.findViewById<TextView>(R.id.tvSuggestionHandle)
                val btnAdd = card.findViewById<Button>(R.id.btnAddSuggestion)
                val btnDelete = card.findViewById<Button>(R.id.btnDeleteSuggestion)

                tvAvatar.text = suggested.name.take(1).uppercase().ifEmpty { "F" }
                tvName.text = suggested.name
                tvHandle.text = "${suggested.username} • From Facebook"

                btnAdd.setOnClickListener {
                    val sent = db.sendFriendRequest(user, suggested.id)
                    if (sent) {
                        btnAdd.text = "Sent"
                        btnAdd.isEnabled = false
                        btnAdd.setBackgroundResource(R.drawable.bg_pill_chip)
                        Toast.makeText(this, "Friend invitation sent to ${suggested.name}!", Toast.LENGTH_SHORT).show()
                    } else {
                        Toast.makeText(this, "Invitation already pending or sent.", Toast.LENGTH_SHORT).show()
                    }
                }

                btnDelete.setOnClickListener {
                    db.dismissSuggestedFriend(user, suggested.id)
                    currentUser = prefs.getCurrentUser()
                    Toast.makeText(this, "Removed from suggestions.", Toast.LENGTH_SHORT).show()
                    renderFacebookSuggestions()
                }

                binding.containerSuggestionsList.addView(card)
            }
        }
    }

    // ----------------------------------------------------
    // ADD FRIEND MODAL (3 Options: Search, 8-Char ID, QR Code)
    // ----------------------------------------------------

    private fun showAddFriendModal() {
        val user = currentUser ?: return
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_add_friend, null)

        val btnClose = dialogView.findViewById<ImageView>(R.id.btnCloseDialog)
        val btnTabSearch = dialogView.findViewById<Button>(R.id.btnTabSearch)
        val btnTabId = dialogView.findViewById<Button>(R.id.btnTabId)
        val btnTabQr = dialogView.findViewById<Button>(R.id.btnTabQr)

        val layoutSearch = dialogView.findViewById<LinearLayout>(R.id.layoutOptionSearch)
        val layoutId = dialogView.findViewById<LinearLayout>(R.id.layoutOptionId)
        val layoutQr = dialogView.findViewById<LinearLayout>(R.id.layoutOptionQr)

        // Search Views
        val etSearch = dialogView.findViewById<EditText>(R.id.etSearchUser)
        val tvSearchNotice = dialogView.findViewById<TextView>(R.id.tvSearchNotice)
        val containerSearchResults = dialogView.findViewById<LinearLayout>(R.id.containerSearchResults)

        // 8-Char ID Views
        val tvMyId = dialogView.findViewById<TextView>(R.id.tvMy8CharId)
        val btnCopyId = dialogView.findViewById<Button>(R.id.btnCopyMyId)
        val etTargetId = dialogView.findViewById<EditText>(R.id.etTarget8CharId)
        val btnSendIdInvite = dialogView.findViewById<Button>(R.id.btnSendIdInvite)

        // QR Code Views
        val ivQr = dialogView.findViewById<ImageView>(R.id.ivMyQrCode)
        val tvQrInfo = dialogView.findViewById<TextView>(R.id.tvQrAccountInfo)
        val etFriendQr = dialogView.findViewById<EditText>(R.id.etFriendQrInput)
        val btnConnectQr = dialogView.findViewById<Button>(R.id.btnConnectQr)

        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .create()

        dialog.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))

        btnClose.setOnClickListener { dialog.dismiss() }

        // Tab Switching logic
        fun switchAddOption(option: Int) {
            val activeBg = R.drawable.bg_pill_chip_active
            val inactiveBg = R.drawable.bg_pill_chip
            val activeColor = ContextCompat.getColor(this, R.color.on_accent)
            val inactiveColor = ContextCompat.getColor(this, R.color.text_secondary)

            btnTabSearch.setBackgroundResource(if (option == 0) activeBg else inactiveBg)
            btnTabSearch.setTextColor(if (option == 0) activeColor else inactiveColor)

            btnTabId.setBackgroundResource(if (option == 1) activeBg else inactiveBg)
            btnTabId.setTextColor(if (option == 1) activeColor else inactiveColor)

            btnTabQr.setBackgroundResource(if (option == 2) activeBg else inactiveBg)
            btnTabQr.setTextColor(if (option == 2) activeColor else inactiveColor)

            layoutSearch.visibility = if (option == 0) View.VISIBLE else View.GONE
            layoutId.visibility = if (option == 1) View.VISIBLE else View.GONE
            layoutQr.visibility = if (option == 2) View.VISIBLE else View.GONE
        }

        btnTabSearch.setOnClickListener { switchAddOption(0) }
        btnTabId.setOnClickListener { switchAddOption(1) }
        btnTabQr.setOnClickListener { switchAddOption(2) }

        // 1. Search Database Logic (Strict Validation: Only real accounts, excludes self)
        etSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                val query = s?.toString()?.trim() ?: ""
                containerSearchResults.removeAllViews()

                if (query.isEmpty()) {
                    tvSearchNotice.text = "Type to find registered athletes. Nonexistent accounts cannot be added."
                    tvSearchNotice.visibility = View.VISIBLE
                    return
                }

                val matches = db.searchUsers(query, user.id)
                if (matches.isEmpty()) {
                    tvSearchNotice.text = "No registered athlete found with that name, @tag, or ID."
                    tvSearchNotice.visibility = View.VISIBLE
                } else {
                    tvSearchNotice.visibility = View.GONE
                    val inflater = LayoutInflater.from(this@MainActivity)
                    for (matchedUser in matches) {
                        val resultView = inflater.inflate(R.layout.item_search_result, containerSearchResults, false)
                        val tvAv = resultView.findViewById<TextView>(R.id.tvResultAvatar)
                        val tvN = resultView.findViewById<TextView>(R.id.tvResultName)
                        val tvH = resultView.findViewById<TextView>(R.id.tvResultHandle)
                        val btnAdd = resultView.findViewById<Button>(R.id.btnResultAdd)

                        tvAv.text = matchedUser.name.take(1).uppercase().ifEmpty { "U" }
                        tvN.text = matchedUser.name
                        tvH.text = "${matchedUser.username} • ID: ${matchedUser.uniqueCode}"

                        val isAlreadyFriend = user.friendsList.contains(matchedUser.id)
                        if (isAlreadyFriend) {
                            btnAdd.text = "Friends"
                            btnAdd.isEnabled = false
                            btnAdd.setBackgroundResource(R.drawable.bg_pill_chip)
                        } else {
                            btnAdd.setOnClickListener {
                                val sent = db.sendFriendRequest(user, matchedUser.id)
                                if (sent) {
                                    btnAdd.text = "Sent"
                                    btnAdd.isEnabled = false
                                    btnAdd.setBackgroundResource(R.drawable.bg_pill_chip)
                                    Toast.makeText(this@MainActivity, "Friend request sent to ${matchedUser.name}!", Toast.LENGTH_SHORT).show()
                                } else {
                                    Toast.makeText(this@MainActivity, "Invitation already pending.", Toast.LENGTH_SHORT).show()
                                }
                            }
                        }
                        containerSearchResults.addView(resultView)
                    }
                }
            }
            override fun afterTextChanged(s: Editable?) {}
        })

        // 2. 8-Char ID Logic
        tvMyId.text = user.uniqueCode
        btnCopyId.setOnClickListener {
            val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = ClipData.newPlainText("StreakStake ID", user.uniqueCode)
            clipboard.setPrimaryClip(clip)
            Toast.makeText(this, "Copied ID: ${user.uniqueCode}", Toast.LENGTH_SHORT).show()
        }

        btnSendIdInvite.setOnClickListener {
            val targetCode = etTargetId.text.toString().trim()
            if (targetCode.isEmpty()) {
                Toast.makeText(this, "Please enter an 8-character ID", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            if (targetCode.equals(user.uniqueCode, ignoreCase = true)) {
                Toast.makeText(this, "You cannot add your own ID.", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            val targetUser = db.findUserByCode(targetCode)
            if (targetUser == null) {
                Toast.makeText(this, "No registered athlete matches that 8-character ID.", Toast.LENGTH_LONG).show()
                return@setOnClickListener
            }

            val sent = db.sendFriendRequest(user, targetUser.id)
            if (sent) {
                Toast.makeText(this, "Invitation sent to ${targetUser.name} (${targetUser.username})!", Toast.LENGTH_SHORT).show()
                dialog.dismiss()
                renderFriendsPage()
            } else {
                Toast.makeText(this, "Invitation already pending or already friends.", Toast.LENGTH_SHORT).show()
            }
        }

        // 3. QR Code Logic (Generate QR code bitmap with ZXing)
        tvQrInfo.text = "${user.name} • ${user.username}"
        val qrPayload = "streakstake:${user.uniqueCode}"
        val qrBitmap = generateQrBitmap(qrPayload, 400)
        if (qrBitmap != null) {
            ivQr.setImageBitmap(qrBitmap)
        }

        btnConnectQr.setOnClickListener {
            val input = etFriendQr.text.toString().trim()
            val cleanCode = input.removePrefix("streakstake:").trim()
            if (cleanCode.isEmpty()) {
                Toast.makeText(this, "Enter a valid QR payload or code", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            val targetUser = db.findUserByCode(cleanCode)
            if (targetUser != null && targetUser.id != user.id) {
                val sent = db.sendFriendRequest(user, targetUser.id)
                if (sent) {
                    Toast.makeText(this, "Connected with ${targetUser.name} via QR!", Toast.LENGTH_SHORT).show()
                    dialog.dismiss()
                    renderFriendsPage()
                } else {
                    Toast.makeText(this, "Already connected or invitation pending.", Toast.LENGTH_SHORT).show()
                }
            } else {
                Toast.makeText(this, "Invalid QR code or athlete not found.", Toast.LENGTH_SHORT).show()
            }
        }

        dialog.show()
    }

    private fun generateQrBitmap(content: String, size: Int = 400): Bitmap? {
        return try {
            val bitMatrix = MultiFormatWriter().encode(content, BarcodeFormat.QR_CODE, size, size)
            val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.RGB_565)
            for (x in 0 until size) {
                for (y in 0 until size) {
                    bitmap.setPixel(x, y, if (bitMatrix[x, y]) Color.BLACK else Color.WHITE)
                }
            }
            bitmap
        } catch (e: Exception) {
            null
        }
    }

    private fun navigateToSignIn() {
        val intent = Intent(this, SignInActivity::class.java)
        startActivity(intent)
        finish()
    }
}
