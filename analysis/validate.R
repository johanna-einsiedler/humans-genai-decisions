# Validation gate: the numbers of Vaccaro, Almaatouq & Malone (2024) must come out of their data with
# the method used on this page, before anything is built on top of it.
suppressPackageStartupMessages({ library(metafor); library(clubSandwich) })
args <- commandArgs(trailingOnly = FALSE); here <- dirname(sub("--file=", "", args[grep("--file=", args)]))
df <- read.csv(file.path(here, "..", "data_extraction_vaccarro.csv"), fileEncoding = "UTF-8-BOM", stringsAsFactors = FALSE)
es <- function(d, base) {
  m2 <- if (base == "s") d$Avg_Perf_Baseline_Adj else d$Avg_Perf_Human_Adj
  s2 <- if (base == "s") d$Sd_Perf_Baseline else d$Sd_Perf_Human
  n2 <- if (base == "s") d$N_Human else d$N_HumanAI
  escalc(measure = "SMD", vtype = "LS", m1i = d$Avg_Perf_HumanAI_Adj, m2i = m2, sd1i = d$Sd_Perf_HumanAI, sd2i = s2, n1i = d$N_HumanAI, n2i = n2)
}
fit <- function(d, base) {
  e <- es(d, base); d$es <- as.numeric(e$yi); d$variance <- as.numeric(e$vi)
  m <- rma.mv(yi = es, V = variance, data = d, tdist = TRUE, method = "REML", random = ~ 1 | Exp_ID_Cleaned/ES_ID)
  r <- robust(m, cluster = d$Exp_ID_Cleaned, clubSandwich = TRUE)
  c(g = as.numeric(r$b), lo = r$ci.lb, hi = r$ci.ub, k = m$k)
}
out <- rbind(`synergy, all 370 (paper: -0.23 [-0.39, -0.07])` = fit(df, "s"),
             `augmentation, all 370 (paper: 0.64 [0.53, 0.74])` = fit(df, "h"),
             `synergy, decision tasks as own model` = fit(df[df$Task_Type == "Decide", ], "s"))
print(round(out, 3))
# the paper's decision-task estimate (-0.27 [-0.44, -0.10]) is a meta-regression level, not a subset model
e <- es(df, "s"); df$es <- as.numeric(e$yi); df$variance <- as.numeric(e$vi)
mm <- rma.mv(es, variance, data = df, mods = ~ factor(Task_Type) - 1, tdist = TRUE, method = "REML", random = ~ 1 | Exp_ID_Cleaned/ES_ID)
rr <- robust(mm, cluster = df$Exp_ID_Cleaned, adjust = TRUE)
print(round(cbind(g = as.numeric(rr$b), lo = rr$ci.lb, hi = rr$ci.ub), 3))
