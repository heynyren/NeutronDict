package com.neutrondict.app.media;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.*;
import java.util.concurrent.TimeUnit;

public class NewsWorker extends Worker {
    public NewsWorker(@NonNull Context context, @NonNull WorkerParameters params) { super(context, params); }
    @NonNull @Override public Result doWork() {
        try { new NewsRepository(getApplicationContext()).refresh(); return Result.success(); }
        catch (Exception e) { return Result.retry(); }
    }
    public static void schedule(Context context, int minutes) {
        WorkManager manager = WorkManager.getInstance(context);
        if (minutes == 0) { manager.cancelUniqueWork("neutrondict-news"); return; }
        Constraints constraints = new Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED).setRequiresBatteryNotLow(true).build();
        PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(NewsWorker.class, Math.max(15, minutes), TimeUnit.MINUTES)
            .setConstraints(constraints).build();
        manager.enqueueUniquePeriodicWork("neutrondict-news", ExistingPeriodicWorkPolicy.UPDATE, request);
    }
}
