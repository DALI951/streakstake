package com.streakstake.app

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.streakstake.app.data.AppPreferences
import com.streakstake.app.databinding.ActivityMainBinding
import com.streakstake.app.models.Stake
import com.streakstake.app.models.User
import java.util.UUID

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var prefs: AppPreferences
    private var currentUser: User? = null

    private var selectedMeters = 500
    private var selectedStakeXp = 100

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = AppPreferences(this)

        currentUser = prefs.getCurrentUser()
        if (currentUser == null) {
            navigateToSignIn()
            return
        }

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupDistanceSelector()
        setupStakeSelector()
        setupActions()
    }

    override fun onResume() {
        super.onResume()
        currentUser = prefs.getCurrentUser()
        if (currentUser == null) {
            navigateToSignIn()
            return
        }
        updateUserHeader()
        renderActiveStakes()
    }

    private fun updateUserHeader() {
        currentUser?.let { user ->
            binding.tvUserName.text = user.name
            binding.tvUserEmail.text = user.email
            binding.tvXpBalance.text = "${user.totalXp} XP"
            binding.tvStreakCount.text = "${user.currentStreak} Days"
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
        binding.btnDist500.setBackgroundResource(if (selectedMeters == 500) R.drawable.btn_orange_rounded else R.drawable.bg_input_field)
        binding.btnDist1000.setBackgroundResource(if (selectedMeters == 1000) R.drawable.btn_orange_rounded else R.drawable.bg_input_field)
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
        binding.btnStake100.setBackgroundResource(if (selectedStakeXp == 100) R.drawable.btn_orange_rounded else R.drawable.bg_input_field)
        binding.btnStake200.setBackgroundResource(if (selectedStakeXp == 200) R.drawable.btn_orange_rounded else R.drawable.bg_input_field)
    }

    private fun setupActions() {
        binding.btnStartWalk.setOnClickListener {
            handleCreateAndStartWalk()
        }

        binding.btnSignOut.setOnClickListener {
            prefs.saveCurrentUser(null)
            navigateToSignIn()
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
            title = "Walk $selectedMeters Meters",
            targetMeters = selectedMeters,
            stakeXp = selectedStakeXp,
            multiplier = 1.5
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

    private fun renderActiveStakes() {
        val activeStakes = prefs.getStakes().filter { !it.isCompleted && !it.isBurned }
        binding.layoutStakesContainer.removeAllViews()

        if (activeStakes.isEmpty()) {
            binding.layoutEmptyStakes.visibility = View.VISIBLE
            binding.layoutStakesContainer.visibility = View.GONE
        } else {
            binding.layoutEmptyStakes.visibility = View.GONE
            binding.layoutStakesContainer.visibility = View.VISIBLE

            val inflater = LayoutInflater.from(this)
            for (stake in activeStakes) {
                val itemView = inflater.inflate(R.layout.item_stake_card, binding.layoutStakesContainer, false)

                val tvTitle = itemView.findViewById<TextView>(R.id.tvCardTitle)
                val tvStakeXp = itemView.findViewById<TextView>(R.id.tvCardStakeXp)
                val btnAction = itemView.findViewById<Button>(R.id.btnCardAction)
                val btnBurn = itemView.findViewById<Button>(R.id.btnCardBurn)

                tvTitle.text = stake.title
                tvStakeXp.text = "${stake.stakeXp} XP"

                btnAction.setOnClickListener {
                    val intent = Intent(this, WalkTrackerActivity::class.java).apply {
                        putExtra("STAKE_ID", stake.id)
                        putExtra("TARGET_METERS", stake.targetMeters)
                        putExtra("STAKE_XP", stake.stakeXp)
                    }
                    startActivity(intent)
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

        stake.isBurned = true
        prefs.updateStake(stake)

        Toast.makeText(this, "Stake Burned: ${stake.stakeXp} XP lost and streak reset to 0.", Toast.LENGTH_SHORT).show()
        updateUserHeader()
        renderActiveStakes()
    }

    private fun navigateToSignIn() {
        val intent = Intent(this, SignInActivity::class.java)
        startActivity(intent)
        finish()
    }
}
