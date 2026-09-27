import { initDb, db } from './connection.js';
import bcrypt from 'bcryptjs';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function randomDate(daysAgo, varianceDays = 1) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo + Math.floor(Math.random() * varianceDays));
  d.setHours(Math.floor(Math.random() * 16) + 7, Math.floor(Math.random() * 60));
  return d.toISOString().replace('T', ' ').split('.')[0];
}

const POSITIVE_WORDS = new Set(['good','great','excellent','amazing','wonderful','fantastic','love','loved','awesome','best','happy','appreciate','helpful','nice','perfect','outstanding','brilliant','impressive','satisfied','enjoy','comfortable','clean','efficient','improved','better','smooth','quick','fast','responsive','friendly','thank','beautiful','glad','proud','pleased','delighted','exceptional','phenomenal','superb','useful','convenient','easy','professional','courteous','welcoming','supportive']);
const NEGATIVE_WORDS = new Set(['bad','poor','terrible','awful','worst','hate','horrible','useless','broken','slow','dirty','rude','problem','issue','fail','failed','wrong','annoying','frustrated','disappointed','waste','neglect','unacceptable','disgusting','pathetic','filthy','damaged','missing','delayed','overdue','absurd','ridiculous','inadequate','insufficient','inconvenient','complicated','unfair','difficult','hard','late','error','crash','dangerous','unsafe','noisy','uncomfortable','cramped','outdated','defective']);
const ABUSE_WORDS = ['trash','joke','idiot','stupid','fool','dumb','crap','suck','sucks','hell','hate','pathetic','moron'];

function classifyText(text, catSlug) {
  const lower = text.toLowerCase();
  const words = lower.split(/\W+/).filter(w => w.length > 1);
  let pos = 0, neg = 0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const prev = i > 0 ? words[i-1] : '';
    const negated = ['not','never','no','barely'].includes(prev);
    if (POSITIVE_WORDS.has(w)) negated ? neg += 0.6 : pos++;
    if (NEGATIVE_WORDS.has(w)) negated ? pos += 0.3 : neg++;
    if (ABUSE_WORDS.includes(w)) neg += 0.5;
  }
  let sentiment = 'neutral';
  if (pos > neg * 1.4) sentiment = 'positive';
  else if (neg > pos * 1.2) sentiment = 'negative';

  const topicMap = { wifi:['wifi','wi-fi','internet','network','connection','bandwidth','router','signal'], hostel:['hostel','dorm','room','block','accommodation'], water:['water','tap','pipe','plumbing'], electricity:['electricity','power','light','generator','ac','fan'], food:['food','mess','meal','cafeteria','lunch','dinner','breakfast','canteen','eat','menu'], hygiene:['hygiene','sanitation','dirty','clean','pest','cockroach'], faculty:['faculty','professor','teacher','lecturer'], exam:['exam','test','result','grade','marks'], assignment:['assignment','submit','submission','deadline'], library:['library','book','reading','journal'], transport:['bus','transport','vehicle','route','shuttle','commute'], fees:['fee','fees','payment','portal','financial','scholarship'], administration:['administration','office','registration','document','certificate'], security:['security','guard','safe','safety','cctv'], sports:['sports','gym','ground','cricket','football','badminton','swimming'], events:['event','fest','cultural','seminar','workshop'], maintenance:['maintenance','repair','broken','leak','damage'] };
  const topics = Object.entries(topicMap).filter(([,kws]) => kws.some(kw => lower.includes(kw))).map(([t]) => t);
  if (!topics.length) topics.push('general');

  const catMap = { 'hostel-accommodation':['hostel','dorm','room','block','water','electricity','light','ac','fan','security','guard','bathroom','toilet','pest','maintenance','warden','repair','leak','bed','furniture','laundry','gym','pool'],'mess-food':['food','mess','meal','cafeteria','canteen','eat','lunch','dinner','breakfast','menu','hygiene','dirty','clean','cook','chef','taste','stale','fresh','snack','kitchen','portion','spice'],'academics-faculty':['faculty','professor','teacher','class','lecture','exam','test','assignment','study','library','book','grade','marks','result','course','curriculum','syllabus','lab','research','academic','tutor','seminar','workshop','placement','internship','scholarship','attendance'],'infrastructure-wifi':['wifi','wi-fi','internet','network','connection','bandwidth','projector','computer','lab','smart','board','ac','air','conditioning','electricity','power','generator','infrastructure','equipment','technology','digital','connectivity','router','signal'],'transport':['bus','transport','vehicle','route','shuttle','commute','delay','late','driver','schedule'],'administration':['fee','fees','payment','portal','registration','document','certificate','office','administration','helpdesk','grievance','approval','event','permission','atm','medical','doctor','printing'] };
  let category = catSlug || 'administration';
  let maxM = 0;
  for (const [cs, kws] of Object.entries(catMap)) { const m = kws.filter(k => lower.includes(k)).length; if (m > maxM) { maxM = m; category = cs; } }

  const hasProfanity = ABUSE_WORDS.some(w => lower.includes(w)) || /[a-z]\*+[a-z]/i.test(lower);
  const isSpam = text.length < 8 || /(.)\1{5,}/.test(text) || (words.length > 3 && new Set(words).size < words.length * 0.4);
  const moderationFlag = hasProfanity || isSpam;
  const moderationReason = hasProfanity ? 'Abusive language detected' : isSpam ? 'Spam detected' : null;

  const wordCount = words.length;
  const conf = Math.min(0.97, Math.max(0.25, 0.35 + Math.min(wordCount * 0.025, 0.35) + topics.filter(t => t !== 'general').length * 0.08 + ((pos + neg) > 0 ? 0.1 : 0)));

  let urgency = 'low';
  if (sentiment === 'negative') {
    const urgentKws = ['days','week','cannot','broken','failed','urgent','submit','deadline','still','multiple','repeated'];
    urgency = urgentKws.filter(k => lower.includes(k)).length >= 2 ? 'high' : 'medium';
  }

  const summary = text.length > 120 ? text.substring(0, 117) + '...' : text;
  const mixed = pos > 0.5 && neg > 0.5;

  return { sentiment, category, topics, confidence: Math.round(conf * 100) / 100, urgency, summary, mixedSignals: mixed, moderationFlag, moderationReason };
}

// ─── Seed data ────────────────────────────────────────────────────────────────
async function seed() {
  await initDb();

  // Clear existing
  db.exec(`DELETE FROM feedback_analysis`);
  db.exec(`DELETE FROM feedback`);
  db.exec(`DELETE FROM admins`);
  db.exec(`DELETE FROM categories`);
  db.exec(`DELETE FROM organizations`);

  // 1. Organization
  const orgRes = db.prepare(`INSERT INTO organizations (name, slug) VALUES (?, ?)`).run('Skyline Institute of Technology', 'skyline-institute');
  const orgId = orgRes.lastInsertRowid;

  // 2. Categories
  const catDefs = [
    { name: 'Hostel & Accommodation', slug: 'hostel-accommodation' },
    { name: 'Mess & Food', slug: 'mess-food' },
    { name: 'Academics & Faculty', slug: 'academics-faculty' },
    { name: 'Infrastructure & Wi-Fi', slug: 'infrastructure-wifi' },
    { name: 'Transport', slug: 'transport' },
    { name: 'Administration', slug: 'administration' },
  ];
  const catIds = {};
  for (const c of catDefs) {
    const r = db.prepare(`INSERT INTO categories (org_id, name, slug) VALUES (?, ?, ?)`).run(orgId, c.name, c.slug);
    catIds[c.slug] = r.lastInsertRowid;
  }

  // 3. Admin
  const hash = bcrypt.hashSync('Admin@123', 10);
  db.prepare(`INSERT INTO admins (email, password_hash, name, role) VALUES (?, ?, ?, ?)`).run('admin@skyline.edu', hash, 'Priya Sharma', 'admin');

  // 4. Feedback entries
  const entries = [
    // ── INFRASTRUCTURE / WI-FI (spike in last 7 days) ──
    { text: "The Wi-Fi in Block B hasn't worked properly for the past 3 days. I missed submitting two assignments because of this. This is completely unacceptable.", cat: 'infrastructure-wifi', days: 5 },
    { text: "Internet in the library goes down every afternoon between 2 and 4 PM for two weeks. How are we supposed to research?", cat: 'infrastructure-wifi', days: 4 },
    { text: "Wi-Fi speed in the hostel rooms is absolutely terrible. I can barely load a webpage, let alone attend online classes.", cat: 'infrastructure-wifi', days: 3 },
    { text: "Network connectivity in the academic block keeps dropping every hour. Professors get frustrated during online presentations. Please fix urgently.", cat: 'infrastructure-wifi', days: 2, name: 'Arjun Mehta' },
    { text: "The computer lab machines are slow and the internet is painfully bad. Lab sessions are a waste of time because of technical issues.", cat: 'infrastructure-wifi', days: 4 },
    { text: "Wi-Fi password keeps expiring without notice. I was in the middle of an exam portal submission and got disconnected. I missed the deadline.", cat: 'infrastructure-wifi', days: 1 },
    { text: "No internet in the reading room of Block A since Monday. Students need internet to access digital resources. Please restore connectivity immediately.", cat: 'infrastructure-wifi', days: 2, name: 'Sneha Patel' },
    { text: "Bandwidth is so throttled in the evening hours that video calls are impossible. Please increase bandwidth during peak study hours.", cat: 'infrastructure-wifi', days: 3 },
    { text: "The Wi-Fi router on the 3rd floor of Block C has been broken for over a week. Maintenance was notified but no action taken.", cat: 'infrastructure-wifi', days: 6 },
    { text: "Internet disconnection issues are severely impacting my ability to attend mandatory online lab sessions. I had to borrow data from friends.", cat: 'infrastructure-wifi', days: 1 },
    { text: "The projector in Room 204 hasn't worked in two weeks. Professors are forced to use a whiteboard for everything.", cat: 'infrastructure-wifi', days: 10 },
    { text: "Network in the female hostel is particularly poor. Boys get better connectivity. This inequality in infrastructure is unfair.", cat: 'infrastructure-wifi', days: 7, name: 'Meera Singh' },
    { text: "Internet speed has improved in the last month. Good initiative by the IT team!", cat: 'infrastructure-wifi', days: 25 },
    { text: "New fiber connection in the library is fantastic. Speeds are blazing fast now.", cat: 'infrastructure-wifi', days: 30, name: 'Ravi Kumar' },
    { text: "New Wi-Fi hotspots installed outside the library are excellent. Good connectivity in outdoor areas.", cat: 'infrastructure-wifi', days: 38 },
    { text: "The new smart classroom in Block A is impressive. Interactive boards and camera setup for hybrid learning is excellent.", cat: 'infrastructure-wifi', days: 29, name: 'Jasmine Kaur' },
    { text: "Wi-Fi connectivity on the sports ground is nonexistent. Students recording games for analysis have to work offline.", cat: 'infrastructure-wifi', days: 4 },
    { text: "Seminar hall air conditioning was repaired promptly after last month's complaint. Quick response appreciated.", cat: 'infrastructure-wifi', days: 15 },
    // ── HOSTEL ──
    { text: "The water supply in Block D is intermittent. Hot water available only for 2 hours in the morning — insufficient for 200 students.", cat: 'hostel-accommodation', days: 15 },
    { text: "Room 312 in Block A has a leaking ceiling. Every time it rains, water drips onto my bed. I reported this 2 weeks ago, still no repair.", cat: 'hostel-accommodation', days: 20, name: 'Rahul Verma' },
    { text: "The common bathrooms in Block B are in terrible condition. Tiles are broken, drainage clogged, smells really bad. Basic hygiene not maintained.", cat: 'hostel-accommodation', days: 12 },
    { text: "Air conditioning in Block C rooms is not working for 3 weeks now. In this heat, sleeping is impossible. Multiple complaints filed with no response.", cat: 'hostel-accommodation', days: 8 },
    { text: "The new hostel furniture is really comfortable and sturdy. Great improvement over the old broken beds. Keep up the good work!", cat: 'hostel-accommodation', days: 22, name: 'Anita Krishnan' },
    { text: "Security at the hostel gate has improved a lot. Guards are now checking IDs properly and late-night incidents have stopped.", cat: 'hostel-accommodation', days: 18 },
    { text: "Electricity goes out almost every night between 10 PM and midnight in Block E. Generator backup isn't sufficient.", cat: 'hostel-accommodation', days: 9 },
    { text: "The hostel common room is amazing after renovation. New TV, comfortable sofas, nice study corner. Students are very happy!", cat: 'hostel-accommodation', days: 35, name: 'Kavitha Nair' },
    { text: "Maintenance requests take too long. I've been waiting 3 weeks for a replacement ceiling fan. It's extremely hot.", cat: 'hostel-accommodation', days: 6 },
    { text: "Pest control in the hostel needs to be more frequent. Found cockroaches in the corridor last night. Very unhygienic.", cat: 'hostel-accommodation', days: 11 },
    { text: "New laundry machines installed in Block A work perfectly. No more hand-washing everything. Such a welcome addition!", cat: 'hostel-accommodation', days: 40, name: 'Preeti Sharma' },
    { text: "Hostel gates close too early at 10 PM. Students attending evening library or events get penalized. Please extend to 11 PM.", cat: 'hostel-accommodation', days: 17 },
    { text: "Warden in Block F is very helpful and approachable. Resolved my room-change request within 24 hours. Excellent!", cat: 'hostel-accommodation', days: 28 },
    { text: "Rooms in Block G are too small for two students. Barely fits the furniture, let alone study tables.", cat: 'hostel-accommodation', days: 14, name: 'Vikram Rao' },
    { text: "It's fine I guess.", cat: 'hostel-accommodation', days: 5 },
    { text: "Medical facility on campus is inadequate. The doctor is only available 2 days a week. Sick students need immediate attention.", cat: 'hostel-accommodation', days: 16 },
    { text: "Gym equipment is outdated and some machines are broken. Either repair or invest in new ones. Current state is not safe.", cat: 'hostel-accommodation', days: 21 },
    { text: "CCTV cameras around campus make me feel much safer, especially during night hours. Security has noticeably improved.", cat: 'hostel-accommodation', days: 44, name: 'Geeta Sharma' },
    { text: "I reported a broken window in Room 408 three weeks ago. No action, no acknowledgment. Very frustrating.", cat: 'hostel-accommodation', days: 10 },
    { text: "Indoor sports facilities like table tennis and badminton courts are excellent. Well-maintained and easy to book.", cat: 'hostel-accommodation', days: 43 },
    { text: "The noise level in hostel common areas at night is very high. Some students play music loudly after 11 PM affecting sleep.", cat: 'hostel-accommodation', days: 8 },
    { text: "The swimming pool renovation is finally done and it looks amazing. Facilities are now at par with top institutes!", cat: 'hostel-accommodation', days: 44, name: 'Dhruv Malhotra' },
    { text: "Water filter in the hostel common area is clean and well-maintained. Cold water facility is great in summer.", cat: 'hostel-accommodation', days: 39 },
    // ── MESS / FOOD ──
    { text: "The new cafeteria seating is much better. More space and comfortable chairs. Food quality has also improved recently.", cat: 'mess-food', days: 33, name: 'Divya Nair' },
    { text: "Sunday breakfast was absolutely delicious this week! The puri bhaji was perfectly made. More variety would be appreciated.", cat: 'mess-food', days: 20 },
    { text: "Mess food quality has deteriorated over the past month. Dal is undercooked, rice has stones sometimes. Please improve quality control.", cat: 'mess-food', days: 13 },
    { text: "The mess hall is always dirty during peak lunch hours. Tables have leftover food, floor is wet and sticky. Staff needs to clean more frequently.", cat: 'mess-food', days: 9 },
    { text: "Loved the new menu this month. Regional dishes every Friday is a fantastic idea. Students from different states really appreciate it.", cat: 'mess-food', days: 38, name: 'Siddharth Joshi' },
    { text: "Food served in the evening is often stale or reheated from lunch. This is a health concern. Fresh food should be prepared for every meal.", cat: 'mess-food', days: 7 },
    { text: "Mess staff are rude when we ask for extra portions. We're paying for this and should be treated with basic courtesy.", cat: 'mess-food', days: 16 },
    { text: "Vegetarian options have increased and the quality is good. As a vegetarian, I'm satisfied with the current mess menu.", cat: 'mess-food', days: 25, name: 'Pooja Iyer' },
    { text: "I found a hair in my food today. This is disgusting. Kitchen staff need to wear hair nets. Hygiene standards must be enforced.", cat: 'mess-food', days: 4 },
    { text: "The mess closes too early on weekends (8 PM). Students returning from outings or events have no dinner option.", cat: 'mess-food', days: 21 },
    { text: "Food is good but the mess hall is always dirty and staff are rude to students asking for seconds.", cat: 'mess-food', days: 11, name: 'Riya Gupta' },
    { text: "New mess manager has clearly improved quality. Cleaner kitchen, better spices, more variety. Really appreciate the change.", cat: 'mess-food', days: 45 },
    { text: "The mess bill increased but quality hasn't improved proportionally. We're paying more for the same mediocre food.", cat: 'mess-food', days: 19 },
    { text: "Really enjoyed the special Diwali feast! Management went all out. Food was great and decoration was festive!", cat: 'mess-food', days: 30, name: 'Aarav Bose' },
    { text: "ok", cat: 'mess-food', days: 3 },
    { text: "The cafeteria near Block D is a welcome addition. No need to walk to the main mess for evening snacks. Reasonably priced.", cat: 'mess-food', days: 34, name: 'Sanjay Mukherjee' },
    { text: "Mess food was actually great this week. Chef made excellent regional dishes. Would love to see this consistency every week!", cat: 'mess-food', days: 3 },
    { text: "The canteen near the library is overpriced. A samosa costs 40 rupees which is way above market rate.", cat: 'mess-food', days: 17 },
    { text: "Mess menu hasn't changed in 6 months. The same rotation gets very boring. Please introduce seasonal variations.", cat: 'mess-food', days: 15 },
    // ── ACADEMICS ──
    { text: "Professor Sharma's data structures class is absolutely phenomenal. His explanations are crystal clear and he always makes time for doubts.", cat: 'academics-faculty', days: 22 },
    { text: "The new online assignment submission portal is really smooth and user-friendly. No more last-minute panic about printouts!", cat: 'academics-faculty', days: 40, name: 'Ishaan Malhotra' },
    { text: "Exam schedule was released very late — only 5 days before the first paper. We had no time to properly prepare.", cat: 'academics-faculty', days: 14 },
    { text: "Faculty response time on email is painfully slow. Some professors take over a week to reply about assignments. Unacceptable.", cat: 'academics-faculty', days: 8 },
    { text: "The library has an excellent collection of journals and textbooks. Digital resources are especially good for research.", cat: 'academics-faculty', days: 35, name: 'Priya Menon' },
    { text: "Professor Gupta is an exceptional teacher. Even complex topics become easy to understand in his sessions.", cat: 'academics-faculty', days: 17 },
    { text: "Result declaration for mid-semester exams took over 6 weeks. By the time we got results, the semester was almost over.", cat: 'academics-faculty', days: 26 },
    { text: "Lab manuals are outdated by 5 years. We're doing experiments based on technologies no longer used in industry.", cat: 'academics-faculty', days: 20, name: 'Aditya Verma' },
    { text: "Loved the guest lecture series this month. Industry professionals talking about real-world applications is incredibly valuable.", cat: 'academics-faculty', days: 12 },
    { text: "The academic counselor is extremely helpful and helped me chart out my electives properly.", cat: 'academics-faculty', days: 28 },
    { text: "Class attendance for online classes is being marked incorrectly. I was marked absent for a session I attended.", cat: 'academics-faculty', days: 10, name: 'Shruti Agarwal' },
    { text: "The internship coordination office is doing great. 200+ companies this year is impressive. My placement was handled smoothly.", cat: 'academics-faculty', days: 42 },
    { text: "Some faculty consistently arrive 10-15 minutes late to class. This wastes valuable lecture time.", cat: 'academics-faculty', days: 15 },
    { text: "Workshop on machine learning last week was outstanding. Hands-on sessions with real datasets were very helpful.", cat: 'academics-faculty', days: 6, name: 'Nikhil Shah' },
    { text: "Grade moderation process is completely opaque. We have no idea how our marks are adjusted. Need more transparency.", cat: 'academics-faculty', days: 18 },
    { text: "Library hours need to be extended. It closes at 8 PM but many students prefer to study late.", cat: 'academics-faculty', days: 9 },
    { text: "Really appreciate the new tutoring program. Senior students helping juniors is a wonderful initiative.", cat: 'academics-faculty', days: 31, name: 'Amrita Pillai' },
    { text: "Placement training sessions have been very practical and useful. Resume workshops and mock interviews are very helpful.", cat: 'academics-faculty', days: 27, name: 'Anika Reddy' },
    { text: "E-learning platform integration with the LMS has made accessing course materials very convenient.", cat: 'academics-faculty', days: 33 },
    { text: "Examination hall ventilation is very poor. Students feel suffocated during 3-hour papers.", cat: 'academics-faculty', days: 11 },
    { text: "Lab attendance scanners malfunction frequently. Students are wrongly marked absent due to technical failures.", cat: 'academics-faculty', days: 7, name: 'Priti Kapoor' },
    { text: "Department seminar board is always outdated. We miss important talks because notice board isn't updated.", cat: 'academics-faculty', days: 23, name: 'Ria Mehta' },
    { text: "Research lab equipment is world-class. Glad to see the institute investing in proper research infrastructure.", cat: 'academics-faculty', days: 36 },
    { text: "Faculty are generally good but some departments have staffing shortages. Several courses running with substitute teachers.", cat: 'academics-faculty', days: 19 },
    // ── TRANSPORT ──
    { text: "The 7:30 AM bus to the city is consistently 20-30 minutes late. Students miss connecting transport. Route 3 needs a schedule fix.", cat: 'transport', days: 11 },
    { text: "Bus drivers are courteous and vehicles well maintained. Felt safe commuting at late hours. Good service overall.", cat: 'transport', days: 38 },
    { text: "The last bus to the city leaves at 6 PM which is too early. Many students have labs until 6:30. Extend to at least 7 PM.", cat: 'transport', days: 16, name: 'Sourav Das' },
    { text: "Buses are overcrowded during peak hours. Students are standing in the aisle which is a safety hazard.", cat: 'transport', days: 7 },
    { text: "Really appreciate the new AC shuttle bus for the 8 AM route. Much more comfortable commute in this heat!", cat: 'transport', days: 44, name: 'Lakshmi Rao' },
    { text: "The bus broke down twice this month leaving students stranded. No backup arrangement was made.", cat: 'transport', days: 5 },
    { text: "Route 2 bus schedule has been revised and now works much better. No more waiting an hour between buses!", cat: 'transport', days: 23 },
    { text: "Bus tracking app is very useful. Knowing the real-time location helps students plan their time better.", cat: 'transport', days: 32, name: 'Aryan Khanna' },
    { text: "Night transport for students working on projects is urgently needed. After 9 PM there's no option except expensive cabs.", cat: 'transport', days: 13 },
    { text: "Bus fee increased by 20% this semester with no corresponding service improvement. This is not justified.", cat: 'transport', days: 10 },
    { text: "Bus route doesn't cover the new off-campus accommodation area. At least 30 students live there with no transport.", cat: 'transport', days: 14 },
    // ── ADMINISTRATION ──
    { text: "The online fee payment portal keeps throwing errors. I've tried to pay my hostel fees for 3 days and it fails every time.", cat: 'administration', days: 8 },
    { text: "Scholarship disbursement is delayed by 2 months this semester. Students depending on it for daily expenses are facing hardship.", cat: 'administration', days: 12 },
    { text: "Certificate verification process is now much faster. Got my bonafide certificate within 2 hours. Thank you admin office!", cat: 'administration', days: 35, name: 'Tanvi Joshi' },
    { text: "The new student helpdesk is excellent! Queries are now resolved within 24 hours. Staff are very friendly and efficient.", cat: 'administration', days: 28 },
    { text: "Registration for elective courses should be made online. Current paper-based process results in long queues and frequent errors.", cat: 'administration', days: 19, name: 'Harsh Patel' },
    { text: "Grievance redressal system is ineffective. Submitted a complaint 6 weeks ago, still no response. Feels like complaints go into a black hole.", cat: 'administration', days: 14 },
    { text: "The fee receipt process has been digitized. No more visiting the accounts office! Online receipts sent immediately.", cat: 'administration', days: 41, name: 'Sunita Desai' },
    { text: "Admission documents were processed smoothly this year. Staff were helpful and clear about requirements.", cat: 'administration', days: 43 },
    { text: "IT support team is very responsive. Fixed my student portal login issue within 30 minutes. Very professional!", cat: 'administration', days: 22 },
    { text: "Event permission process takes too long. By the time approval comes, the event window has passed.", cat: 'administration', days: 17 },
    { text: "ATM on campus is frequently out of cash. Students have to travel off-campus which is inconvenient.", cat: 'administration', days: 13, name: 'Manish Tiwari' },
    { text: "The campus is beautiful after the garden renovation. Green spaces are calming and perfect for outdoor studying.", cat: 'administration', days: 37 },
    { text: "Student union elections were conducted fairly and transparently this year. Good governance model.", cat: 'administration', days: 27 },
    { text: "Mental health counseling services are confidential and very helpful. Counselors are empathetic and professional.", cat: 'administration', days: 36 },
    { text: "The annual cultural fest was brilliantly organized. Best fest in Skyline's history. Events were well-planned!", cat: 'administration', days: 29 },
    { text: "Password reset for student portal is unnecessarily complicated. Needs 3 different verifications for a 30-second task.", cat: 'administration', days: 12 },
    { text: "The institute's solar energy initiative is commendable. Proud to be part of an eco-conscious campus!", cat: 'administration', days: 41, name: 'Eco Student Club' },
    { text: "The printing facility charges are too high and quality is poor. Documents often come out blurry.", cat: 'administration', days: 18 },
    { text: "International student support services are excellent. Cultural integration programs are very welcoming.", cat: 'administration', days: 32, name: 'Alex Thompson' },
    { text: "Need more parking space for students with two-wheelers. Current parking is always full by 9 AM.", cat: 'administration', days: 20 },
    { text: "Coding club activities are amazing. Weekly contests and hackathon preparation sessions are improving technical skills.", cat: 'academics-faculty', days: 24, name: 'Karthik Subramanian' },
    { text: "Anti-ragging committee is very active and approachable. Freshers feel safe and welcomed. Zero tolerance policy is working.", cat: 'hostel-accommodation', days: 42 },
    // ── FLAGGED ──
    { text: "This whole place is trash. Management doesn't care about students at all. You guys are a complete joke running this institution.", cat: 'administration', days: 9, flag: true },
    { text: "The food is absolute crap and whoever manages the mess should be fired immediately. This is pathetic.", cat: 'mess-food', days: 6, flag: true },
    { text: "WIFI IS TERRIBLE TERRIBLE TERRIBLE FIX IT NOW!!!! AAAAAAA", cat: 'infrastructure-wifi', days: 2, flag: true },
    { text: "ok ok ok ok ok ok ok ok ok ok ok ok ok ok ok ok ok", cat: 'mess-food', days: 1, flag: true },
    { text: "Everything sucks here. I hate this place. The management is a bunch of idiots who don't care.", cat: 'hostel-accommodation', days: 4, flag: true },
  ];

  let count = 0;
  for (const e of entries) {
    const catId = catIds[e.cat] || catIds['administration'];
    const createdAt = randomDate(e.days, 2);
    const analysis = classifyText(e.text, e.cat);
    const modStatus = (e.flag || analysis.moderationFlag) ? 'flagged' : 'visible';
    const modReason = e.flag ? 'Abusive language detected' : analysis.moderationReason;

    const fr = db.prepare(`
      INSERT INTO feedback (org_id, text, submitter_name, submitter_email, is_anonymous, user_category_id, moderation_status, moderation_reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(orgId, e.text, e.name || null, null, e.name ? 0 : 1, catId, modStatus, modReason || null, createdAt);

    db.prepare(`
      INSERT INTO feedback_analysis (feedback_id, sentiment, category, topics, confidence, urgency, summary, mixed_signals, source, rule_fallback)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(fr.lastInsertRowid, analysis.sentiment, analysis.category, JSON.stringify(analysis.topics), analysis.confidence, analysis.urgency, analysis.summary, analysis.mixedSignals ? 1 : 0, 'rule', null);

    count++;
  }


  console.log(`✅ Seeded ${count} feedback entries across 6 categories`);
  console.log(`✅ Organization: Skyline Institute of Technology`);
  console.log(`✅ Admin: admin@skyline.edu / Admin@123`);
}

export { seed as runSeed };

// Allow running directly: node src/db/seed.js
if (process.argv[1]?.includes('seed')) {
  seed().catch(e => { console.error(e); process.exit(1); });
}

