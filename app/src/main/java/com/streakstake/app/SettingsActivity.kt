package com.streakstake.app

import android.app.AlertDialog
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.streakstake.app.data.AppPreferences
import com.streakstake.app.databinding.ActivitySettingsBinding
import com.streakstake.app.models.GitHubAsset
import com.streakstake.app.models.GitHubRelease
import com.streakstake.app.updater.GitHubUpdateManager

class SettingsActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySettingsBinding
    private lateinit var prefs: AppPreferences
    private lateinit var updateManager: GitHubUpdateManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        prefs = AppPreferences(this)
        updateManager = GitHubUpdateManager(this)

        setupHeader()
        loadIdentityAndAccount()
        setupUpdater()
        setupSensorsConfig()
        setupDataActions()
    }

    private fun setupHeader() {
        binding.btnBackSettings.setOnClickListener {
            finish()
        }
    }

    private fun loadIdentityAndAccount() {
        val user = prefs.getCurrentUser() ?: return
        val initial = user.name.take(1).uppercase()
        binding.tvSettingsAvatar.text = initial
        binding.tvProfileName.text = user.name
        binding.tvProfileHandle.text = user.username
        binding.tvProfileXp.text = "${user.totalXp} XP"
        binding.pbProfileLevel.progress = user.totalXp.coerceIn(0, 1000)

        binding.etSettingsName.setText(user.name)
        binding.etSettingsHandle.setText(user.username)

        binding.btnSaveAccount.setOnClickListener {
            val newName = binding.etSettingsName.text.toString().trim()
            val newHandle = binding.etSettingsHandle.text.toString().trim()

            if (newName.isEmpty() || newHandle.isEmpty()) {
                Toast.makeText(this, "Please enter both name and handle.", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            prefs.updateAccountDetails(newName, newHandle)
            binding.tvProfileName.text = newName
            binding.tvProfileHandle.text = if (newHandle.startsWith("@")) newHandle else "@$newHandle"
            binding.tvSettingsAvatar.text = newName.take(1).uppercase()
            Toast.makeText(this, "Account updated successfully!", Toast.LENGTH_SHORT).show()
        }
    }

    private fun setupUpdater() {
        binding.tvSettingsVersion.text = "Installed Version: v${BuildConfig.VERSION_NAME}"

        updateManager.checkForUpdates(silent = true, object : GitHubUpdateManager.UpdateCheckCallback {
            override fun onUpdateAvailable(release: GitHubRelease, apkAsset: GitHubAsset) {
                binding.tvUpdateStatusBadge.text = "UPDATE: ${release.tag_name}"
                binding.tvUpdateStatusBadge.setBackgroundResource(R.drawable.bg_pill_chip_active)
                binding.tvUpdateStatusBadge.setTextColor(ContextCompat.getColor(this@SettingsActivity, R.color.on_accent))
            }
            override fun onUpToDate() {
                binding.tvUpdateStatusBadge.text = "UP TO DATE"
            }
            override fun onError(message: String) {}
        })

        binding.btnCheckUpdatesSettings.setOnClickListener {
            Toast.makeText(this, "Checking GitHub Releases...", Toast.LENGTH_SHORT).show()
            updateManager.checkForUpdates(silent = false, object : GitHubUpdateManager.UpdateCheckCallback {
                override fun onUpdateAvailable(release: GitHubRelease, apkAsset: GitHubAsset) {
                    updateManager.showUpdateDialog(this@SettingsActivity, release, apkAsset)
                }
                override fun onUpToDate() {
                    Toast.makeText(this@SettingsActivity, "You are on the latest version (${BuildConfig.VERSION_NAME})", Toast.LENGTH_SHORT).show()
                }
                override fun onError(message: String) {
                    Toast.makeText(this@SettingsActivity, "Error: $message", Toast.LENGTH_SHORT).show()
                }
            })
        }

        binding.btnOpenGitHub.setOnClickListener {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://github.com/DALI951/streakstake/releases"))
            startActivity(intent)
        }
    }

    private fun setupSensorsConfig() {
        binding.switchGps.isChecked = prefs.isGpsEnabled()
        binding.switchHaptic.isChecked = prefs.isHapticEnabled()

        binding.switchGps.setOnCheckedChangeListener { _, isChecked ->
            prefs.setGpsEnabled(isChecked)
            Toast.makeText(this, "GPS Tracking: " + if (isChecked) "Enabled" else "Disabled", Toast.LENGTH_SHORT).show()
        }

        binding.switchHaptic.setOnCheckedChangeListener { _, isChecked ->
            prefs.setHapticEnabled(isChecked)
            Toast.makeText(this, "Haptic Feedback: " + if (isChecked) "Enabled" else "Disabled", Toast.LENGTH_SHORT).show()
        }
    }

    private fun setupDataActions() {
        binding.btnResetData.setOnClickListener {
            AlertDialog.Builder(this)
                .setTitle("Reset Stakes & Data?")
                .setMessage("This will clear active stakes, activity feed, and restore 500 XP.")
                .setPositiveButton("Reset") { _, _ ->
                    prefs.resetAccountData()
                    loadIdentityAndAccount()
                    Toast.makeText(this, "Data reset. 500 XP balance restored.", Toast.LENGTH_SHORT).show()
                }
                .setNegativeButton("Cancel", null)
                .show()
        }

        binding.btnSignOutSettings.setOnClickListener {
            prefs.saveCurrentUser(null)
            val intent = Intent(this, SignInActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            }
            startActivity(intent)
            finish()
        }
    }
}
