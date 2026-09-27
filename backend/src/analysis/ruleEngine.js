// ─── Rule-based analysis engine ───────────────────────────────────────────────
// This is the load-bearing path — always runs, no external dependencies.

const POSITIVE_WORDS = new Set([
  'good','great','excellent','amazing','wonderful','fantastic','love','loved',
  'awesome','best','happy','appreciate','helpful','nice','perfect','outstanding',
  'brilliant','impressive','satisfied','enjoy','comfortable','clean','efficient',
  'improved','better','smooth','quick','fast','responsive','friendly','thank',
  'thanks','beautiful','glad','proud','pleased','delighted','exceptional',
  'phenomenal','fantastic','superb','splendid','remarkable','nice','neat',
  'useful','convenient','easy','simple','clear','professional','courteous',
  'welcoming','supportive','knowledgeable','thorough','dedicated','hardworking',
]);

const NEGATIVE_WORDS = new Set([
  'bad','poor','terrible','awful','worst','hate','horrible','useless','broken',
  'slow','dirty','rude','problem','issue','fail','failed','wrong','annoying',
  'frustrated','disappointed','waste','neglect','unacceptable','disgusting',
  'pathetic','filthy','damaged','missing','delayed','overdue','complaint','absurd',
  'ridiculous','inadequate','insufficient','inconvenient','complicated','unfair',
  'difficult','hard','late','error','errors','bug','bugs','crash','broken',
  'outrageous','terrible','horrible','dangerous','hazardous','unsafe','noisy',
  'uncomfortable','cramped','outdated','deprecated','missing','defective',
]);

const ABUSE_WORDS = [
  'trash','joke','idiot','stupid','fool','dumb','crap','suck','sucks',
  'damn','hell','hate','pathetic','useless','moron','incompetent',
];

const PROFANITY_PATTERNS = [
  /f+u+c+k/i, /s+h+i+t/i, /b+i+t+c+h/i, /a+s+s+h+o+l+e/i,
  /[a-z]\*{2,}[a-z]/i,
];

const URGENCY_KEYWORDS = [
  'days','week','weeks','month',"can't",'cannot','broken','failed','urgent',
  'emergency','immediately','submit','deadline','late','missed','missing',
  'still','yet','multiple','repeated','again','again','always',
];

const CATEGORY_KEYWORD_MAP = {
  'hostel-accommodation': {
    name: 'Hostel & Accommodation',
    keywords: ['hostel','dorm','room','block','accommodation','lodging','water',
      'electricity','light','ac','fan','security','guard','cctv','bathroom',
      'toilet','pest','cockroach','maintenance','warden','repair','leak',
      'ceiling','window','bed','furniture','laundry','gym','pool','parking'],
  },
  'mess-food': {
    name: 'Mess & Food',
    keywords: ['food','mess','meal','cafeteria','canteen','eat','eating','lunch',
      'dinner','breakfast','menu','hygiene','dirty','clean','cook','chef',
      'vegetarian','vegan','taste','stale','fresh','snack','restaurant','kitchen',
      'plate','serve','portion','spice','quality','reheated'],
  },
  'academics-faculty': {
    name: 'Academics & Faculty',
    keywords: ['faculty','professor','teacher','class','lecture','exam','test',
      'assignment','study','library','book','grade','marks','result','course',
      'curriculum','syllabus','lab','research','academic','tutor','seminar',
      'workshop','placement','internship','scholarship','attendance'],
  },
  'infrastructure-wifi': {
    name: 'Infrastructure & Wi-Fi',
    keywords: ['wifi','wi-fi','internet','network','connection','bandwidth','projector',
      'computer','lab','smart','board','ac','air','conditioning','electricity',
      'power','generator','infrastructure','equipment','technology','digital',
      'connectivity','router','signal','speed'],
  },
  'transport': {
    name: 'Transport',
    keywords: ['bus','transport','vehicle','route','shuttle','commute','delay',
      'late','driver','schedule','ticket','fare','pickup','drop','cab',
      'auto','overcrowded'],
  },
  'administration': {
    name: 'Administration',
    keywords: ['fee','fees','payment','portal','registration','document','certificate',
      'office','administration','helpdesk','grievance','complaint','approval',
      'event','permission','atm','medical','doctor','printing','id','card',
      'scholarship','admission','form','process'],
  },
};

const TOPIC_KEYWORD_MAP = {
  wifi: ['wifi', 'wi-fi', 'internet', 'network', 'connection', 'connectivity', 'bandwidth', 'router', 'signal'],
  hostel: ['hostel', 'dorm', 'room', 'block', 'accommodation'],
  water: ['water', 'tap', 'pipe', 'plumbing', 'supply'],
  electricity: ['electricity', 'power', 'light', 'generator', 'ac', 'fan', 'air conditioning'],
  food: ['food', 'mess', 'meal', 'cafeteria', 'lunch', 'dinner', 'breakfast', 'canteen', 'eat', 'menu'],
  hygiene: ['hygiene', 'sanitation', 'filth', 'dirty', 'clean', 'pest', 'cockroach'],
  faculty: ['faculty', 'professor', 'teacher', 'lecturer', 'instructor'],
  exam: ['exam', 'examination', 'test', 'result', 'grade', 'marks'],
  assignment: ['assignment', 'submit', 'submission', 'deadline'],
  library: ['library', 'book', 'reading', 'journal'],
  transport: ['bus', 'transport', 'vehicle', 'route', 'shuttle', 'commute'],
  fees: ['fee', 'fees', 'payment', 'portal', 'financial', 'refund', 'scholarship'],
  administration: ['administration', 'office', 'registration', 'document', 'certificate'],
  security: ['security', 'guard', 'safe', 'safety', 'cctv'],
  sports: ['sports', 'gym', 'ground', 'cricket', 'football', 'badminton', 'swimming'],
  events: ['event', 'fest', 'cultural', 'seminar', 'workshop'],
  maintenance: ['maintenance', 'repair', 'broken', 'leak', 'damage'],
};

export function runRuleEngine(text, userCategorySlug = null) {
  const lower = text.toLowerCase();
  const words = lower.split(/\W+/).filter(w => w.length > 1);

  // Sentiment scoring
  let positiveScore = 0, negativeScore = 0;
  let i = 0;
  while (i < words.length) {
    const word = words[i];
    const prevWord = i > 0 ? words[i - 1] : '';
    const isNegated = ['not', "n't", 'no', 'never', 'barely', "doesn't", 'without'].includes(prevWord);

    if (POSITIVE_WORDS.has(word)) {
      if (isNegated) negativeScore += 0.7;
      else positiveScore++;
    }
    if (NEGATIVE_WORDS.has(word)) {
      if (isNegated) positiveScore += 0.3;
      else negativeScore++;
    }
    if (ABUSE_WORDS.includes(word)) negativeScore += 0.5;
    i++;
  }

  // Determine sentiment
  let sentiment;
  const total = positiveScore + negativeScore;
  if (total === 0) {
    sentiment = 'neutral';
  } else if (positiveScore > negativeScore * 1.4) {
    sentiment = 'positive';
  } else if (negativeScore > positiveScore * 1.2) {
    sentiment = 'negative';
  } else {
    sentiment = 'neutral';
  }

  const mixedSignals = positiveScore > 0.5 && negativeScore > 0.5;

  // Topic extraction
  const topics = [];
  for (const [tag, keywords] of Object.entries(TOPIC_KEYWORD_MAP)) {
    if (keywords.some(kw => lower.includes(kw))) topics.push(tag);
  }
  if (topics.length === 0) topics.push('general');

  // Category inference
  let inferredCategory = userCategorySlug;
  let maxMatches = 0;

  for (const [catSlug, catData] of Object.entries(CATEGORY_KEYWORD_MAP)) {
    const matches = catData.keywords.filter(kw => lower.includes(kw)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      inferredCategory = catSlug;
    }
  }

  // If still no match, use user-provided or default
  if (!inferredCategory || maxMatches === 0) {
    inferredCategory = userCategorySlug || 'administration';
  }

  // Moderation flag
  const hasProfanity = ABUSE_WORDS.some(w => lower.includes(w)) ||
    PROFANITY_PATTERNS.some(p => p.test(text));
  const isSpam = text.length < 8 ||
    /(.)\1{5,}/.test(text) ||
    (text.replace(/\s/g, '').length > 10 && text === text.toUpperCase() && /[A-Z]{10,}/.test(text));
  const isRepetitive = words.length > 3 && new Set(words).size < words.length * 0.4;

  const moderationFlag = hasProfanity || isSpam || isRepetitive;
  let moderationReason = null;
  if (hasProfanity) moderationReason = 'Contains abusive or inappropriate language';
  else if (isSpam) moderationReason = 'Detected as spam (too short, all-caps, or repetitive)';
  else if (isRepetitive) moderationReason = 'Highly repetitive content detected';

  // Confidence
  const wordCount = words.length;
  const meaningfulTopics = topics.filter(t => t !== 'general').length;
  const confidence = Math.min(0.97, Math.max(0.25,
    0.35 +
    Math.min(wordCount * 0.025, 0.35) +
    meaningfulTopics * 0.08 +
    (total > 0 ? 0.1 : 0)
  ));

  // Urgency
  let urgency = 'low';
  if (sentiment === 'negative') {
    const urgentCount = URGENCY_KEYWORDS.filter(k => lower.includes(k)).length;
    if (urgentCount >= 2) urgency = 'high';
    else if (urgentCount >= 1) urgency = 'medium';
    else urgency = 'medium';
  }

  return {
    sentiment,
    category: inferredCategory,
    topics,
    confidence: Math.round(confidence * 100) / 100,
    urgency,
    summary: null,
    mixedSignals,
    moderationFlag,
    moderationReason,
    source: 'rule',
  };
}
