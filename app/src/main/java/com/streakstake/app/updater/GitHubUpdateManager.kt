package com.streakstake.app.updater

import android.app.Activity
import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.LayoutInflater
import android.view.View
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.FileProvider
import com.google.gson.Gson
import com.streakstake.app.BuildConfig
import com.streakstake.app.R
import com.streakstake.app.models.GitHubAsset
import com.streakstake.app.models.GitHubRelease
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class GitHubUpdateManager(private val context: Context) {

    private val executor = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())
    private val gson = Gson()

    companion object {
        private const val GITHUB_REPO_API = "https://api.github.com/repos/DALI951/streakstake/releases/latest"
    }

    interface UpdateCheckCallback {
        fun onUpdateAvailable(release: GitHubRelease, apkAsset: GitHubAsset)
        fun onUpToDate()
        fun onError(message: String)
    }

    fun checkForUpdates(silent: Boolean = false, callback: UpdateCheckCallback? = null) {
        executor.execute {
            try {
                val url = URL(GITHUB_REPO_API)
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "GET"
                conn.connectTimeout = 8000
                conn.readTimeout = 8000
                conn.setRequestProperty("Accept", "application/vnd.github.v3+json")
                conn.setRequestProperty("User-Agent", "StreakStake-Android-App")

                if (conn.responseCode == 200) {
                    val json = conn.inputStream.bufferedReader().use { it.readText() }
                    val release = gson.fromJson(json, GitHubRelease::class.java)

                    val apkAsset = release.assets?.find { it.name.endsWith(".apk", ignoreCase = true) }

                    if (apkAsset != null && isNewerVersion(release.tag_name)) {
                        mainHandler.post {
                            callback?.onUpdateAvailable(release, apkAsset)
                        }
                    } else {
                        mainHandler.post {
                            callback?.onUpToDate()
                            if (!silent) {
                                Toast.makeText(context, "StreakStake is up to date (v${BuildConfig.VERSION_NAME})", Toast.LENGTH_SHORT).show()
                            }
                        }
                    }
                } else {
                    mainHandler.post {
                        callback?.onError("GitHub API error: ${conn.responseCode}")
                        if (!silent) {
                            Toast.makeText(context, "Could not check updates (${conn.responseCode})", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
            } catch (e: Exception) {
                mainHandler.post {
                    callback?.onError(e.message ?: "Network error")
                    if (!silent) {
                        Toast.makeText(context, "Update check failed: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        }
    }

    private fun isNewerVersion(releaseTag: String): Boolean {
        val cleanTag = releaseTag.trim().removePrefix("v").removePrefix("V")
        val current = BuildConfig.VERSION_NAME.trim().removePrefix("v").removePrefix("V")

        if (cleanTag == current) return false

        val remoteParts = cleanTag.split(".").mapNotNull { it.toIntOrNull() }
        val localParts = current.split(".").mapNotNull { it.toIntOrNull() }

        val maxLen = maxOf(remoteParts.size, localParts.size)
        for (i in 0 until maxLen) {
            val r = remoteParts.getOrElse(i) { 0 }
            val l = localParts.getOrElse(i) { 0 }
            if (r > l) return true
            if (r < l) return false
        }
        return false
    }

    fun showUpdateDialog(activity: Activity, release: GitHubRelease, asset: GitHubAsset) {
        val dialogView = LayoutInflater.from(activity).inflate(R.layout.dialog_update_available, null)
        val tvTitle = dialogView.findViewById<TextView>(R.id.tvUpdateTitle)
        val tvNotes = dialogView.findViewById<TextView>(R.id.tvUpdateNotes)
        val progressBar = dialogView.findViewById<ProgressBar>(R.id.pbDownloadProgress)
        val tvProgress = dialogView.findViewById<TextView>(R.id.tvProgressPercent)
        val btnInstall = dialogView.findViewById<Button>(R.id.btnDownloadUpdate)
        val btnDismiss = dialogView.findViewById<Button>(R.id.btnDismissUpdate)

        tvTitle.text = "New Release ${release.tag_name}"
        tvNotes.text = if (!release.body.isNullOrBlank()) release.body else "Performance enhancements and peer staking stability improvements."

        val dialog = AlertDialog.Builder(activity)
            .setView(dialogView)
            .setCancelable(true)
            .create()

        dialog.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))

        btnInstall.setOnClickListener {
            btnInstall.isEnabled = false
            btnInstall.text = "Downloading APK..."
            progressBar.visibility = View.VISIBLE
            tvProgress.visibility = View.VISIBLE

            downloadAndInstallApk(activity, asset.browser_download_url) { percent ->
                mainHandler.post {
                    progressBar.progress = percent
                    tvProgress.text = "$percent%"
                    if (percent >= 100) {
                        btnInstall.text = "Download Complete"
                        dialog.dismiss()
                    }
                }
            }
        }

        btnDismiss.setOnClickListener {
            dialog.dismiss()
        }

        dialog.show()
    }

    private fun downloadAndInstallApk(activity: Activity, downloadUrl: String, onProgress: (Int) -> Unit) {
        executor.execute {
            var input: InputStream? = null
            var output: FileOutputStream? = null
            var connection: HttpURLConnection? = null
            try {
                val url = URL(downloadUrl)
                connection = url.openConnection() as HttpURLConnection
                connection.connectTimeout = 15000
                connection.readTimeout = 15000
                connection.instanceFollowRedirects = true

                // Follow redirects if any (GitHub releases redirect to S3/objects)
                var redirectUrl = downloadUrl
                var status = connection.responseCode
                if (status == HttpURLConnection.HTTP_MOVED_TEMP || status == HttpURLConnection.HTTP_MOVED_PERM || status == 307 || status == 308) {
                    redirectUrl = connection.getHeaderField("Location")
                    connection = URL(redirectUrl).openConnection() as HttpURLConnection
                }

                connection.connect()

                val fileLength = connection.contentLength
                val downloadsDir = activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)
                    ?: activity.filesDir
                val apkFile = File(downloadsDir, "StreakStake-latest.apk")

                if (apkFile.exists()) {
                    apkFile.delete()
                }

                input = connection.inputStream
                output = FileOutputStream(apkFile)

                val data = ByteArray(4096)
                var total: Long = 0
                var count: Int
                while (input.read(data).also { count = it } != -1) {
                    total += count
                    if (fileLength > 0) {
                        val progress = ((total * 100) / fileLength).toInt()
                        onProgress(progress)
                    }
                    output.write(data, 0, count)
                }

                output.flush()
                onProgress(100)

                mainHandler.post {
                    installApk(activity, apkFile)
                }

            } catch (e: Exception) {
                mainHandler.post {
                    Toast.makeText(activity, "Download failed: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
                }
            } finally {
                try {
                    output?.close()
                    input?.close()
                    connection?.disconnect()
                } catch (ignored: Exception) {}
            }
        }
    }

    private fun installApk(activity: Activity, apkFile: File) {
        if (!apkFile.exists()) {
            Toast.makeText(activity, "Update APK not found.", Toast.LENGTH_SHORT).show()
            return
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (!activity.packageManager.canRequestPackageInstalls()) {
                val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                    data = Uri.parse("package:${activity.packageName}")
                }
                activity.startActivity(intent)
                Toast.makeText(activity, "Please allow StreakStake to install updates, then retry.", Toast.LENGTH_LONG).show()
                return
            }
        }

        try {
            val apkUri = FileProvider.getUriForFile(
                activity,
                "${activity.packageName}.fileprovider",
                apkFile
            )

            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(apkUri, "application/vnd.android.package-archive")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION
            }

            activity.startActivity(intent)
        } catch (e: Exception) {
            Toast.makeText(activity, "Cannot launch installer: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
        }
    }
}
