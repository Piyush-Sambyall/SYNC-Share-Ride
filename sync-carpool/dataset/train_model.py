"""
SYNC — Share a Ride
Dataset extension + model training.

The file the user uploaded (carpool_matching_dataset.csv) has exactly one
row and three columns: driver_id, rider_id, label. There is nothing in it
a model can learn from -- no route, timing, or trust features -- so it
can't be used to train anything on its own.

What this script does instead: keeps the *schema and ID convention* the
user started (USR_..._DRIVER / USR_RIDER_NN, driver_id/rider_id/label),
and extends it with the feature columns a real matching model needs,
generating enough synthetic-but-domain-formula-labeled rows to train on
-- the same approach as before, just re-run so the shipped weights are
tied to this project's own dataset file rather than a one-off script.
The single real row the user supplied is kept as row 0.
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score, accuracy_score, roc_auc_score
import json

rng = np.random.default_rng(11)
N = 15000

route_overlap      = rng.beta(2, 2, N)
detour_km          = np.abs(rng.normal(2.5, 2.5, N))
time_overlap_min   = np.clip(rng.normal(20, 15, N), 0, 60)
pref_match         = rng.binomial(1, 0.6, N).astype(float)
rider_rating       = np.clip(rng.normal(4.2, 0.6, N), 1, 5)
driver_rating      = np.clip(rng.normal(4.3, 0.5, N), 1, 5)
driver_ride_count  = rng.integers(0, 200, N)
pickup_distance_km = np.abs(rng.normal(1.2, 1.0, N))

m, C = 10, 4.0
trust_score = (driver_ride_count / (driver_ride_count + m)) * driver_rating + (m / (driver_ride_count + m)) * C

compat = (
    0.34 * route_overlap +
    0.20 * (1 - np.clip(detour_km / 8, 0, 1)) +
    0.18 * (time_overlap_min / 60) +
    0.12 * pref_match +
    0.10 * (trust_score / 5) +
    0.06 * (1 - np.clip(pickup_distance_km / 4, 0, 1))
)
compat = np.clip(compat + rng.normal(0, 0.05, N), 0, 1)
label = (compat > 0.55).astype(int)  # binary match/no-match, mirrors the uploaded file's "label" column

driver_ids = [f"USR_D{100000+i}_DRIVER" for i in range(N)]
rider_ids  = [f"USR_RIDER_{100000+i}" for i in range(N)]

df = pd.DataFrame({
    "driver_id": driver_ids,
    "rider_id": rider_ids,
    "route_overlap": route_overlap.round(4),
    "detour_km": detour_km.round(3),
    "time_overlap_min": time_overlap_min.round(1),
    "pref_match": pref_match,
    "trust_score": trust_score.round(3),
    "pickup_distance_km": pickup_distance_km.round(3),
    "compatibility_score": compat.round(4),
    "label": label,
})

# keep the user's one real, hand-provided row as row 0
real_row = pd.DataFrame([{
    "driver_id": "USR_PIYUSH_DRIVER", "rider_id": "USR_RIDER_01",
    "route_overlap": np.nan, "detour_km": np.nan, "time_overlap_min": np.nan,
    "pref_match": np.nan, "trust_score": np.nan, "pickup_distance_km": np.nan,
    "compatibility_score": np.nan, "label": 1,
}])
df_full = pd.concat([real_row, df], ignore_index=True)
df_full.to_csv("/home/claude/sync-carpool/dataset/carpool_matching_dataset_extended.csv", index=False)

# ---- train on the synthetic feature rows (the real row has no features to learn from) ----
feat_cols = ["route_overlap","detour_km","time_overlap_min","pref_match","trust_score","pickup_distance_km"]
X = df[feat_cols]
y_reg = df["compatibility_score"]
y_clf = df["label"]

Xtr, Xte, ytr_r, yte_r, ytr_c, yte_c = train_test_split(X, y_reg, y_clf, test_size=0.2, random_state=11)

rf_reg = RandomForestRegressor(n_estimators=300, max_depth=8, min_samples_leaf=5, random_state=11)
rf_reg.fit(Xtr, ytr_r)
pred_r = rf_reg.predict(Xte)

rf_clf = RandomForestClassifier(n_estimators=300, max_depth=8, min_samples_leaf=5, random_state=11)
rf_clf.fit(Xtr, ytr_c)
pred_c = rf_clf.predict(Xte)
pred_proba = rf_clf.predict_proba(Xte)[:,1]

importances = dict(zip(feat_cols, rf_reg.feature_importances_.round(4)))

rf_train_pred = rf_reg.predict(Xtr)
surrogate = LinearRegression()
surrogate.fit(Xtr, rf_train_pred)
surrogate_pred = surrogate.predict(Xte)

result = {
    "n_samples_trained_on": int(N),
    "note": "Original upload had 1 row / 0 feature columns; this dataset extends its schema with synthetic, domain-formula-labeled feature rows for training.",
    "regressor_test_mae": round(float(mean_absolute_error(yte_r, pred_r)), 4),
    "regressor_test_r2": round(float(r2_score(yte_r, pred_r)), 4),
    "classifier_test_accuracy": round(float(accuracy_score(yte_c, pred_c)), 4),
    "classifier_test_auc": round(float(roc_auc_score(yte_c, pred_proba)), 4),
    "feature_importances": importances,
    "surrogate_coefficients": dict(zip(feat_cols, surrogate.coef_.round(5))),
    "surrogate_intercept": round(float(surrogate.intercept_), 5),
    "surrogate_fidelity_mae_vs_rf": round(float(mean_absolute_error(rf_reg.predict(Xte), surrogate_pred)), 4),
}
print(json.dumps(result, indent=2))
with open("/home/claude/sync-carpool/dataset/model_output.json", "w") as f:
    json.dump(result, f, indent=2)
