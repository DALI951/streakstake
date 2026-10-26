package com.streakstake.app

import android.app.AlertDialog
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.streakstake.app.data.AppDatabase
import com.streakstake.app.data.AppPreferences
import com.streakstake.app.databinding.ActivitySettingsBinding
import com.streakstake.app.models.GitHubAsset
import com.streakstake.app.models.GitHubRelease
import com.streakstake.app.updater.GitHubUpdateManager
import java.util.UUID

class SettingsActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySettingsBinding
    private lateinit var prefs: AppPreferences
    private lateinit var db: AppDatabase
    private lateinit var updateManager: GitHubUpdateManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        prefs = AppPreferences(this)
        db = AppDatabase.getInstance(this)
        updateManager = GitHubUpdateManager(this)

        setupHeader()
        loadIdentityAndUniqueCode()
        setupAccountLinking()
        setupCleanUpdater()
        loadNotifications()
        setupSignOut()
    }

    private fun setupHeader() {
        binding.btnBackSettings.setOnClickListener {
            finish()
        }
    }

    private fun loadIdentityAndUniqueCode() {
        val user = prefs.getCurrentUser() ?: return
        val initial = user.name.take(1).uppercase()
        binding.tvSettingsAvatar.text = initial
        binding.tvProfileName.text = user.name
        binding.tvProfileHandle.text = user.username
        binding.tvSettings8CharId.text = user.uniqueCode

        binding.btnCopySettingsId.setOnClickListener {
            val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = ClipData.newPlainText("StreakStake ID", user.uniqueCode)
            clipboard.setPrimaryClip(clip)
            Toast.makeText(this, "Copied ID: ${user.uniqueCode}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun setupAccountLinking() {
        val user = prefs.getCurrentUser() ?: return

        // Google status
        binding.tvGoogleAccountStatus.text = user.email.ifEmpty { "Connected via Google" }

        // Facebook status & link action
        val hasFacebook = user.linkedProviders.contains("facebook") || !user.facebookId.isNullOrEmpty()
        if (hasFacebook) {
            binding.tvFacebookAccountStatus.text = "Connected (${user.facebookId ?: "Linked"})"
            binding.btnLinkFacebook.text = "Linked"
            binding.btnLinkFacebook.isEnabled = false
            binding.btnLinkFacebook.setBackgroundResource(R.drawable.bg_pill_chip_active)
        } else {
            binding.tvFacebookAccountStatus.text = "Link Facebook to backup & sync friends"
            binding.btnLinkFacebook.text = "Link"
            binding.btnLinkFacebook.isEnabled = true
            binding.btnLinkFacebook.setOnClickListener {
                showLinkFacebookDialog()
            }
        }
    }

    private fun showLinkFacebookDialog() {
        val user = prefs.getCurrentUser() ?: return
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_facebook_account_picker, null)
        val tvName = dialogView.findViewById<TextView>(R.id.tvFbAccountName)
        val tvEmail = dialogView.findViewById<TextView>(R.id.tvFbAccountEmail)
        val tvAvatar = dialogView.findViewById<TextView>(R.id.tvFbAvatarInitial)
        val btnContinue = dialogView.findViewById<Button>(R.id.btnFbContinue)
        val btnCancel = dialogView.findViewById<Button>(R.id.btnFbCancel)

        val fbName = user.name.ifEmpty { "Dali" }
        tvName.text = fbName
        tvEmail.text = "Link ${user.username} with Facebook profile"
        tvAvatar.text = fbName.take(1).uppercase()
        btnContinue.text = "Link as $fbName"

        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .setCancelable(true)
            .create()

        dialog.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))

        btnContinue.setOnClickListener {
            val fbId = "fb_" + UUID.nameUUIDFromBytes(fbName.toByteArray()).toString().take(10)
            val updated = db.linkFacebookAccount(user, fbId)
            prefs.saveCurrentUser(updated)
            dialog.dismiss()
            Toast.makeText(this, "Facebook account linked as $fbName!", Toast.LENGTH_SHORT).show()
            setupAccountLinking()
        }

        btnCancel.setOnClickListener { dialog.dismiss() }

        dialog.show()
    }

    private fun setupCleanUpdater() {
        binding.tvSettingsVersion.text = "StreakStake v${BuildConfig.VERSION_NAME}"

        // Background check for update status
        updateManager.checkForUpdates(silent = true, object : GitHubUpdateManager.UpdateCheckCallback {
            override fun onUpdateAvailable(release: GitHubRelease, apkAsset: GitHubAsset) {
                binding.tvUpdateStatusBadge.text = "UPDATE READY: ${release.tag_name}"
                binding.tvUpdateStatusBadge.setBackgroundResource(R.drawable.bg_pill_chip_active)
                binding.tvUpdateStatusBadge.setTextColor(ContextCompat.getColor(this@SettingsActivity, R.color.on_accent))
            }

            override fun onUpToDate() {
                binding.tvUpdateStatusBadge.text = "UP TO DATE"
                binding.tvUpdateStatusBadge.setTextColor(ContextCompat.getColor(this@SettingsActivity, R.color.accent_light))
            }

            override fun onError(message: String) {
                binding.tvUpdateStatusBadge.text = "READY"
            }
        })

        // Clean Update Button: One Tap without any changelog dumps
        binding.btnCheckUpdatesSettings.setOnClickListener {
            Toast.makeText(this, "Checking for latest release...", Toast.LENGTH_SHORT).show()
            updateManager.checkForUpdates(silent = false, object : GitHubUpdateManager.UpdateCheckCallback {
                override fun onUpdateAvailable(release: GitHubRelease, apkAsset: GitHubAsset) {
                    updateManager.showUpdateDialog(this@SettingsActivity, release, apkAsset)
                }

                override fun onUpToDate() {
                    Toast.makeText(this@SettingsActivity, "StreakStake is up to date (v${BuildConfig.VERSION_NAME})", Toast.LENGTH_SHORT).show()
                }

                override fun onError(message: String) {
                    Toast.makeText(this@SettingsActivity, "Check failed: $message", Toast.LENGTH_SHORT).show()
                }
            })
        }
    }

    private fun loadNotifications() {
        val user = prefs.getCurrentUser() ?: return
        val notifs = db.getNotificationsForUser(user.id)

        if (notifs.isEmpty()) {
            binding.tvNoNotifications.visibility = View.VISIBLE
        } else {
            binding.tvNoNotifications.visibility = View.GONE
            binding.containerNotifications.removeAllViews()

            notifs.take(10).forEach { notif ->
                val notifLayout = LinearLayout(this).apply {
                    orientation = LinearLayout.VERTICAL
                    setPadding(0, 10, 0, 10)
                }
                val tvTitle = TextView(this).apply {
                    text = notif.title
                    setTextColor(Color.parseColor("#F2F2F5"))
                    textSize = 13f
                    typeface = android.graphics.Typeface.DEFAULT_BOLD
                }
                val tvMsg = TextView(this).apply {
                    text = notif.message
                    setTextColor(Color.parseColor("#9CA3AF"))
                    textSize = 12f
                    setPadding(0, 2, 0, 0)
                }
                val divider = View(this).apply {
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT, 1
                    ).apply { topMargin = 10 }
                    setBackgroundColor(Color.parseColor("#14FFFFFF"))
                }

                notifLayout.addView(tvTitle)
                notifLayout.addView(tvMsg)
                notifLayout.addView(divider)
                binding.containerNotifications.addView(notifLayout)
            }
        }
    }

    private fun setupSignOut() {
        binding.btnSignOutSettings.setOnClickListener {
            AlertDialog.Builder(this)
                .setTitle("Sign Out / Disconnect")
                .setMessage("You can reconnect anytime using your Google account, Facebook account, or your 8-character ID (${prefs.getCurrentUser()?.uniqueCode}).")
                .setPositiveButton("Sign Out") { _, _ ->
                    prefs.saveCurrentUser(null)
                    val intent = Intent(this, SignInActivity::class.java)
                    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    startActivity(intent)
                    finish()
                }
                .setNegativeButton("Cancel", null)
                .show()
        }
    }
}
