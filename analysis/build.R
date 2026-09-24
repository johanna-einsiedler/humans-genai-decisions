# Builds data/derived.json: everything the page draws that is not a plain table lookup.
#
#   Rscript analysis/build.R
#
# Two sources, one method. (1) The data of Vaccaro, Almaatouq & Malone (2024), decision tasks only.
# (2) The new studies: a Metalens release exported as static files (data/config.json names the
# folder). Effect sizes and models are computed EXACTLY as in the paper's analysis script
# (escalc SMD / vtype LS; rma.mv with effect sizes nested in experiments, REML, t-tests; cluster-
# robust inference on experiments). analysis/validate.R shows that this reproduces the paper.
suppressPackageStartupMessages({ library(metafor); library(clubSandwich); library(jsonlite) })

args <- commandArgs(trailingOnly = FALSE)
here <- dirname(sub("--file=", "", args[grep("--file=", args)])); if (!length(here)) here <- "analysis"
root <- normalizePath(file.path(here, ".."))
cfg  <- fromJSON(file.path(root, "data", "config.json"))
# author_details is nested (each author has a list of links); read it unsimplified so it
# survives the round trip as an array of objects rather than being flattened to a data frame.
cfg_raw <- fromJSON(file.path(root, "data", "config.json"), simplifyVector = FALSE)
rel_dir <- file.path(root, "data", cfg$release)
MIN_K <- 4; MIN_EXP <- 2            # a subgroup of the new data is shown from 4 effect sizes in 2 experiments

num <- function(x) suppressWarnings(as.numeric(x))
yn  <- function(x) ifelse(is.na(x), NA, ifelse(x %in% c(TRUE, "True", "true", "Yes", "yes"), "Yes", "No"))

# ── source 1: Vaccaro et al. (2024), decision tasks ─────────────────────────────────────────────
# The papers' names carry accents, so the reader must work in UTF-8 whatever locale the caller
# happens to have: under a C locale read.csv stops at the first accented character and silently
# returns a fraction of the rows. Set the locale here, read the bytes plainly, drop the BOM.
for (loc in c("en_US.UTF-8", "C.UTF-8", "UTF-8")) if (suppressWarnings(Sys.setlocale("LC_CTYPE", loc)) != "") break
v <- read.csv(file.path(root, "data", "vaccaro.csv"), stringsAsFactors = FALSE)
names(v)[1] <- sub("^\ufeff", "", names(v)[1])
if (nrow(v) < 350) stop(sprintf("vaccaro.csv: read %d rows, expected ~370 — the file is truncated or its encoding was not read as UTF-8", nrow(v)))
v <- v[v$Task_Type == "Decide", ]
if (nrow(v) < 300) stop(sprintf("vaccaro.csv: %d decision-task rows, expected ~336", nrow(v)))
vac <- data.frame(
  source = "vaccaro", id = paste0("v", v$ES_ID), exp = paste0("v", v$Exp_ID_Cleaned), row = NA_integer_, status = NA_character_,
  paper = gsub("_", " ", v$Paper_Name), title = v$Title, year = num(v$Year), venue = v$Venue, task = v$Task_Desc,
  condition = v$Condition_Name, metric = v$Perf_Metric, metric_class = v$Perf_Metric_Cleaned, dir = v$Perf_Dir,
  human = num(v$Avg_Perf_Human), ai = num(v$Avg_Perf_AI), hai = num(v$Avg_Perf_HumanAI),
  sd_human = num(v$Sd_Perf_Human), sd_ai = num(v$Sd_Perf_AI), sd_hai = num(v$Sd_Perf_HumanAI),
  n_human = num(v$N_Human), n_hai = num(v$N_HumanAI), sd_base_coded = num(v$Sd_Perf_Baseline),
  human_adj0 = num(v$Avg_Perf_Human_Adj), ai_adj0 = num(v$Avg_Perf_AI_Adj), hai_adj0 = num(v$Avg_Perf_HumanAI_Adj),
  Task_Output = v$Task_Output_Cleaned, Task_Data = v$Task_Data_Cleaned, AI_Type = v$AI_Type_Cleaned, Comp_Type = v$Comp_Type,
  AI_Expl_Incl = v$AI_Expl_Incl, AI_Conf_Incl = v$AI_Conf_Incl, Participant_Expert = v$Participant_Expert,
  Participant_Crowdworker = v$Participant_Crowdworker, Division_Labor = v$Division_Labor, stringsAsFactors = FALSE)

# ── source 2: the Metalens release (static files) ───────────────────────────────────────────────
meta <- fromJSON(file.path(rel_dir, "release.json"), simplifyVector = FALSE)
unit <- Filter(function(u) isTRUE(u$default), meta$units)[[1]]
need <- c("_study", "_title", "_year", "_journal", "_status", "Exp_ID", "Task_Desc", "Task_Type", "Task_Output", "Task_Data", "AI_Type",
          "Comp_Type", "AI_Expl_Incl", "AI_Conf_Incl", "Participant_Expert", "Participant_Source", "Participant_Type_2", "Division_Labor",
          "Condition_Name", "Perf_Metric", "Perf_Metric_Cleaned", "Perf_Dir", "N_Human", "N_HumanAI",
          "Avg_Perf_Human", "Avg_Perf_AI", "Avg_Perf_HumanAI", "Sd_Perf_Human", "Sd_Perf_AI", "Sd_Perf_HumanAI")
have <- vapply(unit$columns, function(c) c$name, "")
if (length(setdiff(need, have)))                      # the "does the release still fit" check
  stop("This release no longer offers columns the page needs: ", paste(setdiff(need, have), collapse = ", "),
       "\n(release v", meta$release$number, ", row layout '", unit$id, "')", call. = FALSE)
tab <- fromJSON(file.path(rel_dir, unit$file), simplifyVector = FALSE)
cn  <- vapply(tab$columns, function(c) c$name, "")
cell <- function(r, k) { x <- r$v[[match(k, cn)]]; if (is.null(x)) NA else x }
col  <- function(k) sapply(tab$rows, function(r) { x <- cell(r, k); if (is.list(x)) paste(unlist(x), collapse = ", ") else x })
multi <- function(x) ifelse(grepl("[;,]| and ", x), "Multiple", x)
out_lvl <- function(x) ifelse(x %in% c("Binary", "Categoric", "Numeric"), x, ifelse(x %in% c("Text", "Image", "Code"), "Open Response", "Multiple"))
crowd <- function(src, typ) ifelse(grepl("crowd|mturk|mechanical turk|prolific", paste(src, typ), ignore.case = TRUE), "Yes", "No")
new <- data.frame(
  source = "new", id = paste0("n", seq_along(tab$rows)), row = seq_along(tab$rows) - 1L, status = as.character(col("_status")),
  exp = paste0("n", sapply(tab$rows, function(r) tab$records[[r$r + 1]]$paper), ".", col("Exp_ID")),
  paper = as.character(col("_study")), title = as.character(col("_title")), year = num(col("_year")), venue = as.character(col("_journal")),
  task = as.character(col("Task_Desc")), condition = as.character(col("Condition_Name")), metric = as.character(col("Perf_Metric")),
  metric_class = as.character(col("Perf_Metric_Cleaned")), dir = as.character(col("Perf_Dir")),
  human = num(col("Avg_Perf_Human")), ai = num(col("Avg_Perf_AI")), hai = num(col("Avg_Perf_HumanAI")),
  sd_human = num(col("Sd_Perf_Human")), sd_ai = num(col("Sd_Perf_AI")), sd_hai = num(col("Sd_Perf_HumanAI")),
  n_human = num(col("N_Human")), n_hai = num(col("N_HumanAI")), sd_base_coded = NA_real_,
  human_adj0 = NA_real_, ai_adj0 = NA_real_, hai_adj0 = NA_real_,
  Task_Output = out_lvl(as.character(col("Task_Output"))), Task_Data = multi(as.character(col("Task_Data"))),
  AI_Type = as.character(col("AI_Type")), Comp_Type = as.character(col("Comp_Type")),
  AI_Expl_Incl = yn(col("AI_Expl_Incl")), AI_Conf_Incl = yn(col("AI_Conf_Incl")), Participant_Expert = yn(col("Participant_Expert")),
  Participant_Crowdworker = crowd(col("Participant_Source"), col("Participant_Type_2")), Division_Labor = yn(col("Division_Labor")),
  stringsAsFactors = FALSE)
new <- new[as.character(col("Task_Type")) == "Decide" & !is.na(new$human) & !is.na(new$ai) & !is.na(new$hai), ]

d <- rbind(vac[, names(new)], new)

# ── per row: direction, baseline, the descriptive quantities ────────────────────────────────────
sgn <- ifelse(d$dir == "Down", -1, 1)
d$human_adj <- ifelse(is.na(d$human_adj0), sgn * d$human, d$human_adj0)      # the paper's own adjusted scores for its rows
d$ai_adj <- ifelse(is.na(d$ai_adj0), sgn * d$ai, d$ai_adj0); d$hai_adj <- ifelse(is.na(d$hai_adj0), sgn * d$hai, d$hai_adj0)
d$uid <- paste0(d$source, seq_len(nrow(d)))                                  # the paper's ES_ID is not unique; the page needs one id per row
lowest <- pmin(d$human_adj, d$ai_adj, d$hai_adj)                             # who is the worst of the three (ties count for each)
d$worst_human <- d$human_adj == lowest; d$worst_ai <- d$ai_adj == lowest; d$worst_team <- d$hai_adj == lowest
d$team_vs_ai <- sign(d$hai_adj - d$ai_adj)                                   # 1 team beats AI alone, 0 tie, -1 AI alone wins
d$Baseline  <- ifelse(d$ai_adj > d$human_adj, "AI", "Human")                 # who performs better alone
d$base_adj  <- pmax(d$ai_adj, d$human_adj)
d$sd_base   <- ifelse(d$Baseline == "AI", ifelse(is.na(d$sd_ai), 0, d$sd_ai), d$sd_human)   # AI alone: no spread over people (codebook)
d$sd_base   <- ifelse(is.na(d$sd_base_coded), d$sd_base, d$sd_base_coded)                   # the paper's own coding where it exists (reproduces it exactly)
d$helps     <- d$hai_adj > d$base_adj
# proportion scale: all three scores within 0-1; new-data rows reported on 0-100 for an accuracy / percent metric are divided by 100
three <- cbind(d$human_adj, d$ai_adj, d$hai_adj)
unit01 <- apply(three, 1, function(x) all(x >= 0 & x <= 1))
pct    <- !unit01 & d$source == "new" & apply(three, 1, function(x) all(x >= 0 & x <= 100)) &
          (d$metric_class == "Accuracy" | grepl("%|percent|accuracy|proportion", d$metric, ignore.case = TRUE))
d$prop <- unit01 | pct; d$rescaled <- pct
f <- ifelse(pct, 100, 1)
d$human_p <- ifelse(d$prop, d$human_adj / f, NA); d$ai_p <- ifelse(d$prop, d$ai_adj / f, NA); d$hai_p <- ifelse(d$prop, d$hai_adj / f, NA)
d$margin_pp <- 100 * (d$hai_p - pmax(d$human_p, d$ai_p)); d$ai_adv_pp <- 100 * (d$ai_p - d$human_p)

# ── effect sizes, as the paper ──────────────────────────────────────────────────────────────────
ok <- !is.na(d$sd_hai) & !is.na(d$sd_human) & !is.na(d$n_hai) & !is.na(d$n_human) & d$n_hai > 1 & d$n_human > 1
es_s <- escalc("SMD", vtype = "LS", m1i = d$hai_adj, m2i = d$base_adj, sd1i = d$sd_hai, sd2i = d$sd_base, n1i = d$n_hai, n2i = d$n_human)
es_h <- escalc("SMD", vtype = "LS", m1i = d$hai_adj, m2i = d$human_adj, sd1i = d$sd_hai, sd2i = d$sd_human, n1i = d$n_hai, n2i = d$n_hai)
# the team against the AI alone (the paper's third comparison): AI alone has no spread over people (SD 0 unless reported)
es_a <- escalc("SMD", vtype = "LS", m1i = d$hai_adj, m2i = d$ai_adj, sd1i = d$sd_hai, sd2i = ifelse(is.na(d$sd_ai), 0, d$sd_ai), n1i = d$n_hai, n2i = d$n_human)
for (o in c("s", "h", "a")) {
  e <- get(paste0("es_", o)); y <- ifelse(ok, as.numeric(e$yi), NA); vv <- ifelse(ok, as.numeric(e$vi), NA)
  y[!is.finite(y)] <- NA; vv[is.na(y)] <- NA
  d[[paste0("g_", o)]] <- y; d[[paste0("v_", o)]] <- vv
  d[[paste0("g_", o, "_lo")]] <- y - qnorm(.975) * sqrt(vv); d[[paste0("g_", o, "_hi")]] <- y + qnorm(.975) * sqrt(vv)
}

# ── models ──────────────────────────────────────────────────────────────────────────────────────
fit <- function(x, o, mod = NULL) {
  x <- x[!is.na(x[[paste0("g_", o)]]), ]; x$es <- x[[paste0("g_", o)]]; x$variance <- x[[paste0("v_", o)]]
  tryCatch({
    if (is.null(mod)) {
      m <- rma.mv(es, variance, data = x, tdist = TRUE, method = "REML", random = ~ 1 | exp/id)
      r <- robust(m, cluster = x$exp, clubSandwich = TRUE)
      data.frame(level = "All effect sizes", g = as.numeric(r$b), lo = r$ci.lb, hi = r$ci.ub, p = r$pval)
    } else {
      x <- x[!is.na(x[[mod]]), ]; x$lvl <- factor(x[[mod]])
      if (nlevels(x$lvl) < 2) {                       # one level only: that level IS the overall model of this subset
        r <- fit(x, o); r$level <- levels(x$lvl); return(r) }
      m <- rma.mv(es, variance, data = x, mods = ~ lvl - 1, tdist = TRUE, method = "REML", random = ~ 1 | exp/id)
      r <- robust(m, cluster = x$exp, adjust = TRUE)
      data.frame(level = levels(x$lvl), g = as.numeric(r$b), lo = r$ci.lb, hi = r$ci.ub, p = r$pval)
    }
  }, error = function(e) NULL)
}
counts <- function(x, o, mod, lvl) { x <- x[!is.na(x[[paste0("g_", o)]]), ]; if (!is.null(mod)) x <- x[!is.na(x[[mod]]) & x[[mod]] == lvl, ]
  c(k = nrow(x), n_exp = length(unique(x$exp))) }

MODS <- list(list("Baseline", "Who performs better alone?"), list("Task_Output", "Task output"), list("Task_Data", "Task data"),
             list("AI_Type", "AI type"), list("Comp_Type", "Experimental design"), list("AI_Expl_Incl", "AI explanation included"),
             list("AI_Conf_Incl", "AI confidence included"), list("Participant_Expert", "Expert participants"),
             list("Participant_Crowdworker", "Crowdworker participants"), list("Division_Labor", "Division of labour"))
pooled <- list(); subgroups <- list(); omitted <- list()
for (o in c("s", "h", "a")) for (src in c("vaccaro", "new")) {
  r <- suppressWarnings(fit(d[d$source == src, ], o)); cnt <- counts(d[d$source == src, ], o, NULL, NULL)
  pooled[[length(pooled) + 1]] <- list(outcome = o, source = src, k = cnt[["k"]], n_exp = cnt[["n_exp"]],
                                        g = if (is.null(r)) NA else r$g, lo = if (is.null(r)) NA else r$lo, hi = if (is.null(r)) NA else r$hi)
}
for (m in MODS) {
  res <- list(); for (o in c("s", "h")) for (src in c("vaccaro", "new")) res[[paste(o, src)]] <- suppressWarnings(fit(d[d$source == src, ], o, m[[1]]))
  for (lvl in sort(unique(na.omit(d[[m[[1]]]])))) {
    kn <- counts(d[d$source == "new", ], "s", m[[1]], lvl); kv <- counts(d[d$source == "vaccaro", ], "s", m[[1]], lvl)
    show <- kn[["k"]] >= MIN_K && kn[["n_exp"]] >= MIN_EXP && kv[["k"]] >= MIN_K
    if (!show) { omitted[[length(omitted) + 1]] <- list(moderator = m[[2]], level = lvl, k_new = kn[["k"]], n_exp_new = kn[["n_exp"]], k_vaccaro = kv[["k"]]); next }
    for (o in c("s", "h")) for (src in c("vaccaro", "new")) {
      r <- res[[paste(o, src)]]; r <- if (is.null(r)) NULL else r[r$level == lvl, ]
      if (is.null(r) || !nrow(r) || is.na(r$g)) {      # the joint regression was not estimable (a level with one experiment …): this level on its own
        x <- d[d$source == src & !is.na(d[[m[[1]]]]) & d[[m[[1]]]] == lvl, ]; r <- suppressWarnings(fit(x, o)) }
      cnt <- counts(d[d$source == src, ], o, m[[1]], lvl)
      subgroups[[length(subgroups) + 1]] <- list(moderator = m[[2]], level = lvl, outcome = o, source = src, k = cnt[["k"]], n_exp = cnt[["n_exp"]],
        g = if (is.null(r) || !nrow(r)) NA else r$g, lo = if (is.null(r) || !nrow(r)) NA else r$lo, hi = if (is.null(r) || !nrow(r)) NA else r$hi)
    }
  }
}

# ── write ───────────────────────────────────────────────────────────────────────────────────────
src_info <- function(x) list(k = nrow(x), k_with_g = sum(!is.na(x$g_s)), k_prop = sum(x$prop), n_exp = length(unique(x$exp)), n_papers = length(unique(x$paper)),
                             years = range(x$year, na.rm = TRUE))
keep <- c("source", "uid", "worst_human", "worst_ai", "worst_team", "team_vs_ai", "id", "exp", "row", "status", "paper", "title", "year", "venue", "task", "condition", "metric", "metric_class", "dir",
          "human", "ai", "hai", "n_human", "n_hai", "Baseline", "helps", "prop", "rescaled", "human_p", "ai_p", "hai_p", "margin_pp", "ai_adv_pp",
          "g_s", "g_s_lo", "g_s_hi", "g_h", "g_h_lo", "g_h_hi", "Task_Output", "Task_Data", "AI_Type", "Comp_Type", "AI_Expl_Incl", "AI_Conf_Incl",
          "Participant_Expert", "Participant_Crowdworker", "Division_Labor")
out <- list(
  meta = list(built_at = format(Sys.time(), "%Y-%m-%dT%H:%M:%S%z"), r = R.version.string, metafor = as.character(packageVersion("metafor")),
              rule = list(min_k = MIN_K, min_exp = MIN_EXP), unit = unit$id, release_dir = cfg$release,
              dataset_label = if (is.null(cfg$dataset_label)) meta$dataset$title else cfg$dataset_label,
              genai_blurb = if (is.null(cfg$genai_blurb)) "" else cfg$genai_blurb,
              authors = if (is.null(cfg$authors)) "" else cfg$authors,
              author_details = if (is.null(cfg_raw$author_details)) list() else cfg_raw$author_details,
              verified_by = if (is.null(cfg$verified_by)) "" else cfg$verified_by, metalens_url = if (is.null(cfg$metalens_url)) "" else cfg$metalens_url,
              release = list(number = meta$release$number, created_at = meta$release$created_at, content_sha = meta$release$content_sha,
                             dataset = meta$dataset$title, citation = meta$dataset$citation, credibility = meta$credibility,
                             n_papers = meta$n_papers, left_out = meta$left_out,
                             doi = if (is.null(meta$release$doi)) "" else meta$release$doi),
              sources = list(vaccaro = src_info(d[d$source == "vaccaro", ]), new = src_info(d[d$source == "new", ]))),
  pooled = pooled, subgroups = subgroups, omitted = omitted, effects = d[, keep])
write_json(out, file.path(root, "data", "derived.json"), auto_unbox = TRUE, digits = 6, na = "null", dataframe = "rows", pretty = FALSE)

cat(sprintf("Vaccaro (decisions): %d effect sizes, %d experiments | new studies (release v%s): %d rows, %d with Hedges' g from %d experiments\n",
            nrow(vac), length(unique(vac$exp)), meta$release$number, sum(d$source == "new"), sum(d$source == "new" & !is.na(d$g_s)),
            length(unique(d$exp[d$source == "new" & !is.na(d$g_s)]))))
for (p in pooled) cat(sprintf("  %-12s %-8s k=%3d  g = %6.3f [%6.3f, %6.3f]\n", c(s = "synergy", h = "augmentation", a = "vs AI alone")[[p$outcome]], p$source, p$k, p$g, p$lo, p$hi))
cat(sprintf("subgroup rows shown: %d levels; omitted: %d\n", length(unique(sapply(subgroups, function(s) paste(s$moderator, s$level)))), length(omitted)))
