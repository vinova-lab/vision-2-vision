import { runRuleEngine } from './ruleEngine.js';
import { runAIAnalysis } from './aiClient.js';

/**
 * Main analysis pipeline.
 * 1. Always run rule engine first (synchronous, no deps)
 * 2. Attempt AI call with timeout (best-effort)
 * 3. Validate AI output — if invalid/failed, keep rule result
 * 4. Return merged result with source field
 */
export async function analyzeText(text, userCategorySlug = null) {
  // Step 1: Rule engine (always succeeds)
  const ruleResult = runRuleEngine(text, userCategorySlug);

  // Step 2: Attempt AI analysis
  let finalResult = { ...ruleResult };
  let ruleFallback = null;

  try {
    const aiResult = await runAIAnalysis(text, ruleResult);

    if (aiResult) {
      // AI succeeded and validated — use it, store rule result as fallback
      ruleFallback = { ...ruleResult };
      finalResult = {
        sentiment: aiResult.sentiment,
        category: aiResult.category,
        topics: aiResult.topics,
        confidence: aiResult.confidence,
        urgency: aiResult.urgency,
        summary: aiResult.summary,
        mixedSignals: aiResult.mixedSignals,
        moderationFlag: ruleResult.moderationFlag, // Always use rule engine for moderation
        moderationReason: ruleResult.moderationReason,
        source: 'ai',
        ruleFallback,
      };
    }
  } catch (err) {
    // AI call threw unexpectedly — rule result is already the default
    console.warn('[Analysis] Unexpected error in AI pipeline:', err.message);
  }

  // Always generate a summary if AI didn't provide one
  if (!finalResult.summary) {
    finalResult.summary = text.length > 150
      ? text.substring(0, 147) + '...'
      : text;
  }

  return finalResult;
}

export { runRuleEngine };
