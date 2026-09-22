<!--
The written parts of the page. Edit this file; nothing here is generated.

{placeholders} are filled from data/derived.json at load, so the numbers follow every new release.
The SENTENCES do not: when the conclusions change, a person changes them here. To help with that,
`written_for` below records the conclusions this text was written for; when a rebuild finds
different ones, the page shows a notice to its readers until the text (and `written_for`) are updated.

Available placeholders (see js/text.js for the full list):
  {vac_k} {vac_exp} {vac_papers} {vac_years}     {new_k} {new_exp} {new_papers} {new_years} {new_k_g}
  {g_s_vac} {g_h_vac} {g_a_vac} {g_s_new} {g_h_new} {g_a_new}   — "g = 0.65 (95% CI 0.54 to 0.76)"
  {ci_a_vac} … — "0.22 (95% CI −0.13 to 0.57)" (number only, no "g =")
  {vac_link} — the linked citation; {dataset} — the dataset's name
  {concl_s_new} {concl_h_new} {concl_a_new} — deterministic wording from the interval: "a gain" (CI above 0),
      "a loss" (CI below 0), "no clear difference" (CI covers 0)
  {trend_h_new} — "thus confirming the trend" / "reversing the earlier trend" / "leaving the earlier trend unconfirmed"
-->

written_for:                              # the conclusions the sentences below were written around; the page
  synergy_new: no clear difference        # shows a "needs a review" notice when a rebuild finds different ones
  augmentation_new: a gain
  vs_ai_new: no clear difference

## summary

In the {vac_k} decision-task comparisons from {vac_exp} experiments collected by {vac_link}, the human–AI combination did worse than the better of the two alone: {g_s_vac}. However, compared against the human alone, the human–AI combination performed better: {g_h_vac}. Humans gained from using an AI, but the combination rarely beat the stronger single performer. Losses from keeping a “human in the loop” were largest when the AI alone was already better than the human.

This analysis adds {new_papers} papers ({new_years}) to the pool, all focusing on large language models in the context of decision tasks. They contribute {new_k} comparisons with a human-alone, an AI-alone and a combined score. {new_k_g} of them, from {new_exp} experiments, also report the spread needed for a standardised effect size. For those, the team against the better of the two gives {g_s_new}. We thus find {concl_s_new} based on these studies alone. Against the human alone the GenAI studies show {g_h_new}, {trend_h_new}. Against the AI alone they show {g_a_new}: {concl_a_new} ({vac_link}: {ci_a_vac}).

## lede

{vac_link} pooled three years of experiments and found that human–AI teams, on average, did *worse* than the better of the human or the AI working alone. Those experiments end in mid-2023, before large language models became everyday tools. This page keeps their evidence on decision tasks and adds new experiments with generative AI.
