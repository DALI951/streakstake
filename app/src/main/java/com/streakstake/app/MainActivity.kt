package com.streakstake.app

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.streakstake.app.data.AppPreferences
import com.streakstake.app.databinding.ActivityMainBinding
import com.streakstake.app.models.Friend
import com.streakstake.app.models.GitHubAsset
import com.streakstake.app.models.GitHubRelease
import com.streakstake.app.models.SocialFeedItem
import com.streakstake.app.models.Stake
import com.streakstake.app.models.StakeStatus
import com.streakstake.app.models.User
import com.streakstake.app.updater.GitHubUpdateManager
import java.util.UUID

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var prefs: AppPreferences
    private lateinit var updateManager: GitHubUpdateManager
    private var currentUser: User? = null

    private var selectedMeters = 500
    private var selectedStakeXp = 100
    private var currentTab = 0 // 0 = Stakes, 1 = Verify, 2 = Feed, 3 = Friends

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = AppPreferences(this)
        updateManager = GitHubUpdateManager(this)

        currentUser = prefs.getCurrentUser()
        if (currentUser == null) {
            navigateToSignIn()
            return
        }

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupTabs()
        setupDistanceSelector()
        setupStakeSelector()
        setupActions()
        setupGitHubUpdater()
    }

    override fun onResume() {
        super.onResume()
        currentUser = prefs.getCurrentUser()
        if (currentUser == null) {
            navigateToSignIn()
            return
        }
        updateUserHeader()
        renderCurrentTab()
    }

    private fun updateUserHeader() {
        currentUser?.let { user ->
            binding.tvUserName.text = user.name
            binding.tvUserHandle.text = if (user.username.isNotEmpty()) user.username else "@" + user.name.lowercase().replace(" ", "_")
            binding.tvXpBalance.text = "${user.totalXp} XP"
            binding.tvStreakCount.text = "${user.currentStreak} Days"
        }
    }

    private fun setupGitHubUpdater() {
        // Check for updates automatically in background (silent mode)
        updateManager.checkForUpdates(silent = true, object : GitHubUpdateManager.UpdateCheckCallback {
            override fun onUpdateAvailable(release: GitHubRelease, apkAsset: GitHubAsset) {
                binding.btnCheckUpdate.text = "⚡ UPDATE (${release.tag_name})"
                binding.btnCheckUpdate.setTextColor(ContextCompat.getColor(this@MainActivity, R.color.brand_orange))
            }
            override fun onUpToDate() {}
            override fun onError(message: String) {}
        })

        // Tap manual update button
        binding.btnCheckUpdate.setOnClickListener {
            Toast.makeText(this, "Checking GitHub for latest release...", Toast.LENGTH_SHORT).show()
            updateManager.checkForUpdates(silent = false, object : GitHubUpdateManager.UpdateCheckCallback {
                override fun onUpdateAvailable(release: GitHubRelease, apkAsset: GitHubAsset) {
                    updateManager.showUpdateDialog(this@MainActivity, release, apkAsset)
                }
                override fun onUpToDate() {
                    Toast.makeText(this@MainActivity, "StreakStake is up to date (${BuildConfig.VERSION_NAME})", Toast.LENGTH_SHORT).show()
                }
                override fun onError(message: String) {
                    Toast.makeText(this@MainActivity, "Update check failed: $message", Toast.LENGTH_SHORT).show()
                }
            })
        }
    }

    private fun setupTabs() {
        binding.tabStakes.setOnClickListener { selectTab(0) }
        binding.tabVerify.setOnClickListener { selectTab(1) }
        binding.tabFeed.setOnClickListener { selectTab(2) }
        binding.tabLeaderboard.setOnClickListener { selectTab(3) }
        updateTabStyles()
    }

    private fun selectTab(tabIndex: Int) {
        currentTab = tabIndex
        updateTabStyles()
        renderCurrentTab()
    }

    private fun updateTabStyles() {
        val orange = ContextCompat.getColor(this, R.color.brand_orange)
        val gray = ContextCompat.getColor(this, R.color.text_gray)

        binding.tabStakesText.setTextColor(if (currentTab == 0) orange else gray)
        binding.tabVerifyText.setTextColor(if (currentTab == 1) orange else gray)
        binding.tabFeedText.setTextColor(if (currentTab == 2) orange else gray)
        binding.tabLeaderboardText.setTextColor(if (currentTab == 3) orange else gray)

        binding.tabStakesView.visibility = if (currentTab == 0) View.VISIBLE else View.GONE
        binding.tabVerifyView.visibility = if (currentTab == 1) View.VISIBLE else View.GONE
        binding.tabFeedView.visibility = if (currentTab == 2) View.VISIBLE else View.GONE
        binding.tabLeaderboardView.visibility = if (currentTab == 3) View.VISIBLE else View.GONE
    }

    private fun renderCurrentTab() {
        when (currentTab) {
            0 -> renderActiveStakes()
            1 -> renderPeerVerificationQueue()
            2 -> renderSocialFeed()
            3 -> renderLeaderboardAndFriends()
        }
    }

    private fun setupDistanceSelector() {
        binding.btnDist250.setOnClickListener {
            selectedMeters = 250
            updateDistanceButtons()
        }
        binding.btnDist500.setOnClickListener {
            selectedMeters = 500
            updateDistanceButtons()
        }
        binding.btnDist1000.setOnClickListener {
            selectedMeters = 1000
            updateDistanceButtons()
        }
    }

    private fun updateDistanceButtons() {
        binding.btnDist250.setBackgroundResource(if (selectedMeters == 250) R.drawable.btn_orange_rounded else R.drawable.bg_input_field)
        binding.btnDist250.setTextColor(ContextCompat.getColor(this, if (selectedMeters == 250) R.color.bg_black else R.color.text_white))

        binding.btnDist500.setBackgroundResource(if (selectedMeters == 500) R.drawable.btn_orange_rounded else R.drawable.bg_input_field)
        binding.btnDist500.setTextColor(ContextCompat.getColor(this, if (selectedMeters == 500) R.color.bg_black else R.color.text_white))

        binding.btnDist1000.setBackgroundResource(if (selectedMeters == 1000) R.drawable.btn_orange_rounded else R.drawable.bg_input_field)
        binding.btnDist1000.setTextColor(ContextCompat.getColor(this, if (selectedMeters == 1000) R.color.bg_black else R.color.text_white))
    }

    private fun setupStakeSelector() {
        binding.btnStake50.setOnClickListener {
            selectedStakeXp = 50
            updateStakeButtons()
        }
        binding.btnStake100.setOnClickListener {
            selectedStakeXp = 100
            updateStakeButtons()
        }
        binding.btnStake200.setOnClickListener {
            selectedStakeXp = 200
            updateStakeButtons()
        }
    }

    private fun updateStakeButtons() {
        binding.btnStake50.setBackgroundResource(if (selectedStakeXp == 50) R.drawable.btn_orange_rounded else R.drawable.bg_input_field)
        binding.btnStake50.setTextColor(ContextCompat.getColor(this, if (selectedStakeXp == 50) R.color.bg_black else R.color.text_white))

        binding.btnStake100.setBackgroundResource(if (selectedStakeXp == 100) R.drawable.btn_orange_rounded else R.drawable.bg_input_field)
        binding.btnStake100.setTextColor(ContextCompat.getColor(this, if (selectedStakeXp == 100) R.color.bg_black else R.color.text_white))

        binding.btnStake200.setBackgroundResource(if (selectedStakeXp == 200) R.drawable.btn_orange_rounded else R.drawable.bg_input_field)
        binding.btnStake200.setTextColor(ContextCompat.getColor(this, if (selectedStakeXp == 200) R.color.bg_black else R.color.text_white))
    }

    private fun setupActions() {
        binding.btnStartWalk.setOnClickListener {
            handleCreateAndStartWalk()
        }

        binding.btnSignOut.setOnClickListener {
            prefs.saveCurrentUser(null)
            navigateToSignIn()
        }

        binding.btnAddFriend.setOnClickListener {
            val query = binding.etAddFriend.text.toString().trim()
            if (query.isEmpty()) {
                binding.etAddFriend.error = "Enter @username or email"
                return@setOnClickListener
            }

            val handle = if (query.startsWith("@")) query else "@$query"
            val newFriend = Friend(
                id = "fr_" + UUID.randomUUID().toString().take(6),
                name = handle.removePrefix("@").replaceFirstChar { it.uppercase() },
                username = handle,
                totalXp = 500,
                streak = 0
            )

            if (prefs.addFriend(newFriend)) {
                Toast.makeText(this, "Added $handle to your accountability circle!", Toast.LENGTH_SHORT).show()
                binding.etAddFriend.text.clear()
                renderLeaderboardAndFriends()
            } else {
                Toast.makeText(this, "$handle is already in your circle.", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun handleCreateAndStartWalk() {
        val user = currentUser ?: return

        if (user.totalXp < selectedStakeXp) {
            Toast.makeText(this, "Insufficient XP! You have ${user.totalXp} XP, need $selectedStakeXp XP.", Toast.LENGTH_SHORT).show()
            return
        }

        // Deduct stake from available XP
        user.totalXp -= selectedStakeXp
        prefs.saveCurrentUser(user)

        val newStake = Stake(
            id = "stake_" + UUID.randomUUID().toString().take(8),
            creatorId = user.id,
            creatorName = user.name,
            title = "Walk $selectedMeters Meters",
            targetMeters = selectedMeters,
            stakeXp = selectedStakeXp,
            multiplier = 1.5,
            status = StakeStatus.ACTIVE
        )

        prefs.addStake(newStake)

        // Launch Walk Tracker
        val intent = Intent(this, WalkTrackerActivity::class.java).apply {
            putExtra("STAKE_ID", newStake.id)
            putExtra("TARGET_METERS", selectedMeters)
            putExtra("STAKE_XP", selectedStakeXp)
        }
        startActivity(intent)
    }

    // --- TAB 1: RENDER STAKES ---
    private fun renderActiveStakes() {
        val stakes = prefs.getStakes().filter { !it.isBurned }
        binding.layoutStakesContainer.removeAllViews()

        if (stakes.isEmpty()) {
            binding.layoutEmptyStakes.visibility = View.VISIBLE
            binding.layoutStakesContainer.visibility = View.GONE
        } else {
            binding.layoutEmptyStakes.visibility = View.GONE
            binding.layoutStakesContainer.visibility = View.VISIBLE

            val inflater = LayoutInflater.from(this)
            for (stake in stakes) {
                val itemView = inflater.inflate(R.layout.item_stake_card, binding.layoutStakesContainer, false)

                val tvCategory = itemView.findViewById<TextView>(R.id.tvCardCategory)
                val tvTitle = itemView.findViewById<TextView>(R.id.tvCardTitle)
                val tvDesc = itemView.findViewById<TextView>(R.id.tvCardDesc)
                val tvStakeXp = itemView.findViewById<TextView>(R.id.tvCardStakeXp)
                val btnAction = itemView.findViewById<Button>(R.id.btnCardAction)
                val btnBurn = itemView.findViewById<Button>(R.id.btnCardBurn)

                tvTitle.text = stake.title
                tvStakeXp.text = "${stake.stakeXp} XP"

                if (stake.isPending) {
                    tvCategory.text = "PENDING VERIFICATION"
                    tvCategory.setTextColor(ContextCompat.getColor(this, R.color.brand_orange))
                    tvDesc.text = "Proof submitted (${stake.currentMeters}m). Waiting for peer approval."
                    btnAction.text = "In Escrow"
                    btnAction.isEnabled = false
                } else if (stake.isCompleted) {
                    tvCategory.text = "VERIFIED & WON"
                    tvCategory.setTextColor(ContextCompat.getColor(this, R.color.brand_orange))
                    tvDesc.text = "Completed (${stake.currentMeters}m). XP and streak payout awarded!"
                    btnAction.text = "Completed"
                    btnAction.isEnabled = false
                    btnBurn.visibility = View.GONE
                } else {
                    tvCategory.text = "ACTIVE TRACK"
                    tvDesc.text = "Target: ${stake.targetMeters}m. Accelerometer and GPS active."
                    btnAction.text = "Resume Tracker"
                    btnAction.isEnabled = true
                    btnAction.setOnClickListener {
                        val intent = Intent(this, WalkTrackerActivity::class.java).apply {
                            putExtra("STAKE_ID", stake.id)
                            putExtra("TARGET_METERS", stake.targetMeters)
                            putExtra("STAKE_XP", stake.stakeXp)
                        }
                        startActivity(intent)
                    }
                }

                btnBurn.setOnClickListener {
                    burnStake(stake)
                }

                binding.layoutStakesContainer.addView(itemView)
            }
        }
    }

    private fun burnStake(stake: Stake) {
        val user = currentUser ?: return
        user.currentStreak = 0
        user.challengesFailed += 1
        prefs.saveCurrentUser(user)

        stake.status = StakeStatus.BURNED
        prefs.updateStake(stake)
        prefs.removePeerPendingStake(stake.id)

        prefs.addSocialFeedItem(
            SocialFeedItem(
                id = "feed_" + UUID.randomUUID().toString().take(8),
                userId = user.id,
                userName = user.name,
                actionType = "STAKE_BURNED",
                description = "Forfeited '${stake.title}'. Lost ${stake.stakeXp} XP and streak reset to 0.",
                xpAmount = stake.stakeXp
            )
        )

        Toast.makeText(this, "Stake Burned: ${stake.stakeXp} XP lost & streak reset to 0.", Toast.LENGTH_SHORT).show()
        updateUserHeader()
        renderActiveStakes()
    }

    // --- TAB 2: PEER VERIFICATION QUEUE ---
    private fun renderPeerVerificationQueue() {
        val pending = prefs.getPeerPendingStakes().filter { it.status == StakeStatus.PENDING_VERIFICATION }
        binding.layoutVerifyContainer.removeAllViews()

        if (pending.isEmpty()) {
            binding.layoutEmptyVerify.visibility = View.VISIBLE
            binding.layoutVerifyContainer.visibility = View.GONE
        } else {
            binding.layoutEmptyVerify.visibility = View.GONE
            binding.layoutVerifyContainer.visibility = View.VISIBLE

            val inflater = LayoutInflater.from(this)
            for (stake in pending) {
                val itemView = inflater.inflate(R.layout.item_verify_card, binding.layoutVerifyContainer, false)

                val tvUser = itemView.findViewById<TextView>(R.id.tvVerifyUser)
                val tvMetrics = itemView.findViewById<TextView>(R.id.tvVerifyMetrics)
                val tvNote = itemView.findViewById<TextView>(R.id.tvVerifyNote)
                val tvStakeXp = itemView.findViewById<TextView>(R.id.tvVerifyStakeXp)
                val btnApprove = itemView.findViewById<Button>(R.id.btnVerifyApprove)
                val btnReject = itemView.findViewById<Button>(R.id.btnVerifyReject)

                tvUser.text = stake.creatorName.ifEmpty { "Challenger" }
                tvMetrics.text = "${stake.title} • ${stake.currentMeters}m (${stake.stepsCount} steps recorded)"
                tvNote.text = "Proof Note: " + (stake.proofNote ?: "Hardware sensor verified.")
                tvStakeXp.text = "${stake.stakeXp} XP Locked"

                btnApprove.setOnClickListener {
                    approvePeerProof(stake)
                }

                btnReject.setOnClickListener {
                    rejectPeerProof(stake)
                }

                binding.layoutVerifyContainer.addView(itemView)
            }
        }
    }

    private fun approvePeerProof(stake: Stake) {
        val verifier = currentUser ?: return

        stake.status = StakeStatus.VERIFIED
        stake.verifiedBy = verifier.name
        prefs.updateStake(stake)
        prefs.removePeerPendingStake(stake.id)

        // Award reward to user if it was own or peer
        val bonus = (stake.stakeXp * 0.5).toInt()
        val totalReward = stake.stakeXp + bonus

        val user = prefs.getCurrentUser()
        if (user != null && user.id == stake.creatorId) {
            user.totalXp += totalReward
            user.currentStreak += 1
            user.bestStreak = maxOf(user.bestStreak, user.currentStreak)
            user.challengesCompleted += 1
            prefs.saveCurrentUser(user)
        }

        prefs.addSocialFeedItem(
            SocialFeedItem(
                id = "feed_" + UUID.randomUUID().toString().take(8),
                userId = stake.creatorId,
                userName = stake.creatorName.ifEmpty { "Challenger" },
                actionType = "PEER_VERIFIED",
                description = "${verifier.name} verified proof for '${stake.title}'! +$totalReward XP paid out.",
                xpAmount = totalReward
            )
        )

        Toast.makeText(this, "Proof Verified! +$totalReward XP released to ${stake.creatorName}.", Toast.LENGTH_SHORT).show()
        updateUserHeader()
        renderPeerVerificationQueue()
    }

    private fun rejectPeerProof(stake: Stake) {
        val verifier = currentUser ?: return

        stake.status = StakeStatus.BURNED
        prefs.updateStake(stake)
        prefs.removePeerPendingStake(stake.id)

        val user = prefs.getCurrentUser()
        if (user != null && user.id == stake.creatorId) {
            user.currentStreak = 0
            user.challengesFailed += 1
            prefs.saveCurrentUser(user)
        }

        prefs.addSocialFeedItem(
            SocialFeedItem(
                id = "feed_" + UUID.randomUUID().toString().take(8),
                userId = stake.creatorId,
                userName = stake.creatorName.ifEmpty { "Challenger" },
                actionType = "STAKE_BURNED",
                description = "${verifier.name} rejected proof for '${stake.title}'. ${stake.stakeXp} XP burned!",
                xpAmount = stake.stakeXp
            )
        )

        Toast.makeText(this, "Proof Rejected. ${stake.stakeXp} XP burned.", Toast.LENGTH_SHORT).show()
        updateUserHeader()
        renderPeerVerificationQueue()
    }

    // --- TAB 3: SOCIAL FEED ---
    private fun renderSocialFeed() {
        val feed = prefs.getSocialFeed()
        binding.layoutFeedContainer.removeAllViews()

        if (feed.isEmpty()) {
            binding.layoutEmptyFeed.visibility = View.VISIBLE
            binding.layoutFeedContainer.visibility = View.GONE
        } else {
            binding.layoutEmptyFeed.visibility = View.GONE
            binding.layoutFeedContainer.visibility = View.VISIBLE

            val inflater = LayoutInflater.from(this)
            for (item in feed) {
                val itemView = inflater.inflate(R.layout.item_feed_card, binding.layoutFeedContainer, false)

                val tvIcon = itemView.findViewById<TextView>(R.id.tvFeedIcon)
                val tvUser = itemView.findViewById<TextView>(R.id.tvFeedUser)
                val tvDesc = itemView.findViewById<TextView>(R.id.tvFeedDescription)
                val tvTime = itemView.findViewById<TextView>(R.id.tvFeedTime)
                val tvXpBadge = itemView.findViewById<TextView>(R.id.tvFeedXpBadge)

                tvIcon.text = when (item.actionType) {
                    "PEER_VERIFIED", "STAKE_VERIFIED" -> "✓"
                    "STAKE_BURNED" -> "💀"
                    "PROOF_SUBMITTED" -> "📸"
                    else -> "🔥"
                }

                tvUser.text = item.userName
                tvDesc.text = item.description

                val minutesAgo = ((System.currentTimeMillis() - item.timestamp) / 60000).toInt()
                tvTime.text = if (minutesAgo <= 1) "Just now" else "${minutesAgo}m ago"

                tvXpBadge.text = "${item.xpAmount} XP"

                binding.layoutFeedContainer.addView(itemView)
            }
        }
    }

    // --- TAB 4: LEADERBOARD & FRIENDS ---
    private fun renderLeaderboardAndFriends() {
        binding.layoutLeaderboardContainer.removeAllViews()
        val user = currentUser ?: return

        // Build list with current user + friends
        val list = mutableListOf<Friend>()
        list.add(
            Friend(
                id = user.id,
                name = user.name + " (You)",
                username = user.username,
                totalXp = user.totalXp,
                streak = user.currentStreak
            )
        )
        list.addAll(prefs.getFriends())
        // Sort by XP descending, then streak descending
        list.sortWith(compareByDescending<Friend> { it.totalXp }.thenByDescending { it.streak })

        val inflater = LayoutInflater.from(this)
        for ((index, friend) in list.withIndex()) {
            val itemView = inflater.inflate(R.layout.item_leaderboard_card, binding.layoutLeaderboardContainer, false)

            val tvRank = itemView.findViewById<TextView>(R.id.tvRankNumber)
            val tvName = itemView.findViewById<TextView>(R.id.tvLeaderboardName)
            val tvStreak = itemView.findViewById<TextView>(R.id.tvLeaderboardStreak)
            val tvXp = itemView.findViewById<TextView>(R.id.tvLeaderboardXp)

            val rank = index + 1
            tvRank.text = rank.toString()
            if (rank == 1) {
                tvRank.setBackgroundResource(R.drawable.btn_orange_rounded)
                tvRank.setTextColor(ContextCompat.getColor(this, R.color.bg_black))
            } else {
                tvRank.setBackgroundResource(R.drawable.bg_input_field)
                tvRank.setTextColor(ContextCompat.getColor(this, R.color.text_white))
            }

            tvName.text = "${friend.name}  ${friend.username}"
            tvStreak.text = "${friend.streak} Day Streak"
            tvXp.text = "${friend.totalXp} XP"

            binding.layoutLeaderboardContainer.addView(itemView)
        }
    }

    private fun navigateToSignIn() {
        val intent = Intent(this, SignInActivity::class.java)
        startActivity(intent)
        finish()
    }
}
