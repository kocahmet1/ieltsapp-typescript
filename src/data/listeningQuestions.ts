import { ListeningTest, IELTSListeningSection } from '../types';

export const listeningTests: ListeningTest[] = [
  // ===================================
  // Section 1 - Everyday Conversations
  // ===================================
  {
    id: 'l1-hotel-booking',
    title: 'Hotel Reservation',
    section: 'section1',
    topic: 'Travel & Accommodation',
    difficulty: 'easy',
    transcript: `
Receptionist: Good morning, Riverside Hotel. How may I help you?

Caller: Hello, I'd like to make a reservation for next weekend, please.

Receptionist: Certainly. What dates are you looking at?

Caller: From Friday the 15th to Sunday the 17th of March.

Receptionist: Let me check availability. That's two nights, correct?

Caller: Yes, that's right. We need a double room.

Receptionist: I have a standard double room available at 85 pounds per night, or a superior room with a sea view at 120 pounds per night.

Caller: The superior room sounds lovely. We'll take that one.

Receptionist: Excellent choice. Could I have your name, please?

Caller: Yes, it's Thompson. Sarah Thompson.

Receptionist: And a contact number?

Caller: 07845 632198.

Receptionist: Perfect. And how would you like to pay?

Caller: By credit card, please. It's a Visa card.

Receptionist: Great. Do you have any special requests?

Caller: Actually, yes. Could we have a room on a higher floor? My husband doesn't sleep well with street noise.

Receptionist: I'll make a note of that. I can put you on the fourth floor.

Caller: That would be perfect. And what time is check-in?

Receptionist: Check-in is from 2 PM. Would you like breakfast included? It's an additional 15 pounds per person per day.

Caller: Yes, please include breakfast for both of us.

Receptionist: Certainly. So that's a superior double room with sea view, fourth floor, breakfast for two, arriving March 15th, departing March 17th. Your total comes to 300 pounds.

Caller: That sounds correct. Thank you very much.

Receptionist: You're welcome. We'll send a confirmation email shortly. Is there anything else I can help you with?

Caller: No, that's everything. Thank you.

Receptionist: Thank you for choosing Riverside Hotel. We look forward to seeing you.
    `.trim(),
    audioText: `Good morning, Riverside Hotel. How may I help you?
    
Hello, I'd like to make a reservation for next weekend, please.

Certainly. What dates are you looking at?

From Friday the 15th to Sunday the 17th of March.

Let me check availability. That's two nights, correct?

Yes, that's right. We need a double room.

I have a standard double room available at 85 pounds per night, or a superior room with a sea view at 120 pounds per night.

The superior room sounds lovely. We'll take that one.

Excellent choice. Could I have your name, please?

Yes, it's Thompson. Sarah Thompson.

And a contact number?

07845 632198.

Perfect. And how would you like to pay?

By credit card, please. It's a Visa card.

Great. Do you have any special requests?

Actually, yes. Could we have a room on a higher floor? My husband doesn't sleep well with street noise.

I'll make a note of that. I can put you on the fourth floor.

That would be perfect. And what time is check-in?

Check-in is from 2 PM. Would you like breakfast included? It's an additional 15 pounds per person per day.

Yes, please include breakfast for both of us.

Certainly. So that's a superior double room with sea view, fourth floor, breakfast for two, arriving March 15th, departing March 17th. Your total comes to 300 pounds.

That sounds correct. Thank you very much.

You're welcome. We'll send a confirmation email shortly.`,
    duration: 120,
    questions: [
      {
        id: 1,
        questionText: 'What dates does the caller want to stay?',
        questionType: 'multiple_choice',
        options: [
          { letter: 'A', text: 'March 13th to 15th' },
          { letter: 'B', text: 'March 15th to 17th' },
          { letter: 'C', text: 'March 17th to 19th' },
          { letter: 'D', text: 'March 14th to 16th' }
        ],
        correctAnswer: 'B',
        audioTimestamp: 15,
        explanation: 'The caller says "From Friday the 15th to Sunday the 17th of March."'
      },
      {
        id: 2,
        questionText: 'How much does the superior room cost per night?',
        questionType: 'completion',
        correctAnswer: '120',
        acceptableAnswers: ['120 pounds', '£120', '120 GBP'],
        audioTimestamp: 35,
        explanation: 'The receptionist states "a superior room with a sea view at 120 pounds per night."'
      },
      {
        id: 3,
        questionText: "What is the caller's surname?",
        questionType: 'completion',
        correctAnswer: 'Thompson',
        acceptableAnswers: ['thompson', 'THOMPSON'],
        audioTimestamp: 48,
        explanation: 'The caller says "Yes, it\'s Thompson. Sarah Thompson."'
      },
      {
        id: 4,
        questionText: 'What type of payment will the caller use?',
        questionType: 'multiple_choice',
        options: [
          { letter: 'A', text: 'Cash' },
          { letter: 'B', text: 'Debit card' },
          { letter: 'C', text: 'Credit card (Visa)' },
          { letter: 'D', text: 'Bank transfer' }
        ],
        correctAnswer: 'C',
        audioTimestamp: 58,
        explanation: 'The caller says "By credit card, please. It\'s a Visa card."'
      },
      {
        id: 5,
        questionText: 'Which floor will the room be on?',
        questionType: 'completion',
        correctAnswer: '4',
        acceptableAnswers: ['fourth', 'four', '4th'],
        audioTimestamp: 72,
        explanation: 'The receptionist says "I can put you on the fourth floor."'
      },
      {
        id: 6,
        questionText: 'What time is check-in?',
        questionType: 'multiple_choice',
        options: [
          { letter: 'A', text: '12 PM' },
          { letter: 'B', text: '1 PM' },
          { letter: 'C', text: '2 PM' },
          { letter: 'D', text: '3 PM' }
        ],
        correctAnswer: 'C',
        audioTimestamp: 80,
        explanation: 'The receptionist states "Check-in is from 2 PM."'
      },
      {
        id: 7,
        questionText: 'What is the total cost of the stay?',
        questionType: 'completion',
        correctAnswer: '300',
        acceptableAnswers: ['300 pounds', '£300', '300 GBP'],
        audioTimestamp: 100,
        explanation: 'The receptionist confirms "Your total comes to 300 pounds."'
      }
    ],
    createdAt: new Date()
  },

  {
    id: 'l1-doctor-appointment',
    title: 'Medical Appointment',
    section: 'section1',
    topic: 'Health & Medical',
    difficulty: 'easy',
    transcript: `
Receptionist: Good afternoon, City Medical Centre.

Patient: Hello, I'd like to book an appointment with Dr. Mitchell, please.

Receptionist: Of course. Is this for a routine check-up or do you have a specific concern?

Patient: I've been having some headaches lately, quite severe ones.

Receptionist: I see. How long have you been experiencing these headaches?

Patient: About two weeks now. They come and go, but they're getting worse.

Receptionist: Alright, let me see when Dr. Mitchell is available. Can I take your name?

Patient: Yes, it's James Morrison.

Receptionist: And your date of birth?

Patient: The 23rd of June, 1985.

Receptionist: Thank you. I can see you're registered with us. Dr. Mitchell has an opening this Thursday at 10:30 AM or next Monday at 3:15 PM.

Patient: Thursday would be better for me.

Receptionist: That's fine. Thursday the 8th at 10:30 AM with Dr. Mitchell. Can I confirm your address is still 47 Oak Street?

Patient: Actually, I've moved. My new address is 82 Pine Avenue.

Receptionist: I'll update that. And is your phone number still 07923 445566?

Patient: Yes, that's correct.

Receptionist: Perfect. Is there anything else you'd like me to note for the doctor?

Patient: Yes, could you mention that the headaches are usually worse in the morning? And I've also been feeling a bit dizzy.

Receptionist: I've added that to your notes. Please arrive 10 minutes early to complete any paperwork.

Patient: Will do. Thank you very much.

Receptionist: You're welcome. Take care, Mr. Morrison.
    `.trim(),
    audioText: `Good afternoon, City Medical Centre.

Hello, I'd like to book an appointment with Dr. Mitchell, please.

Of course. Is this for a routine check-up or do you have a specific concern?

I've been having some headaches lately, quite severe ones.

I see. How long have you been experiencing these headaches?

About two weeks now. They come and go, but they're getting worse.

Alright, let me see when Dr. Mitchell is available. Can I take your name?

Yes, it's James Morrison.

And your date of birth?

The 23rd of June, 1985.

Thank you. I can see you're registered with us. Dr. Mitchell has an opening this Thursday at 10:30 AM or next Monday at 3:15 PM.

Thursday would be better for me.

That's fine. Thursday the 8th at 10:30 AM with Dr. Mitchell. Can I confirm your address is still 47 Oak Street?

Actually, I've moved. My new address is 82 Pine Avenue.

I'll update that. And is your phone number still 07923 445566?

Yes, that's correct.

Perfect. Is there anything else you'd like me to note for the doctor?

Yes, could you mention that the headaches are usually worse in the morning? And I've also been feeling a bit dizzy.

I've added that to your notes. Please arrive 10 minutes early to complete any paperwork.

Will do. Thank you very much.`,
    duration: 110,
    questions: [
      {
        id: 1,
        questionText: 'What is the main reason for the appointment?',
        questionType: 'multiple_choice',
        options: [
          { letter: 'A', text: 'Routine check-up' },
          { letter: 'B', text: 'Headaches' },
          { letter: 'C', text: 'Back pain' },
          { letter: 'D', text: 'Flu symptoms' }
        ],
        correctAnswer: 'B',
        audioTimestamp: 18,
        explanation: 'The patient says "I\'ve been having some headaches lately, quite severe ones."'
      },
      {
        id: 2,
        questionText: 'How long has the patient had this problem?',
        questionType: 'completion',
        correctAnswer: '2 weeks',
        acceptableAnswers: ['two weeks', 'about two weeks', '2', 'two'],
        audioTimestamp: 25,
        explanation: 'The patient states "About two weeks now."'
      },
      {
        id: 3,
        questionText: "What is the patient's date of birth?",
        questionType: 'completion',
        correctAnswer: '23 June 1985',
        acceptableAnswers: ['23/06/1985', '23-06-1985', 'June 23 1985', '23rd June 1985'],
        audioTimestamp: 42,
        explanation: 'The patient says "The 23rd of June, 1985."'
      },
      {
        id: 4,
        questionText: 'What day and time is the appointment?',
        questionType: 'multiple_choice',
        options: [
          { letter: 'A', text: 'Monday at 3:15 PM' },
          { letter: 'B', text: 'Thursday at 10:30 AM' },
          { letter: 'C', text: 'Thursday at 3:15 PM' },
          { letter: 'D', text: 'Monday at 10:30 AM' }
        ],
        correctAnswer: 'B',
        audioTimestamp: 55,
        explanation: 'The receptionist confirms "Thursday the 8th at 10:30 AM with Dr. Mitchell."'
      },
      {
        id: 5,
        questionText: "What is the patient's new address?",
        questionType: 'completion',
        correctAnswer: '82 Pine Avenue',
        acceptableAnswers: ['82 pine avenue', '82, Pine Avenue'],
        audioTimestamp: 68,
        explanation: 'The patient says "My new address is 82 Pine Avenue."'
      },
      {
        id: 6,
        questionText: 'When are the headaches usually worse?',
        questionType: 'multiple_choice',
        options: [
          { letter: 'A', text: 'In the afternoon' },
          { letter: 'B', text: 'In the evening' },
          { letter: 'C', text: 'In the morning' },
          { letter: 'D', text: 'At night' }
        ],
        correctAnswer: 'C',
        audioTimestamp: 85,
        explanation: 'The patient mentions "the headaches are usually worse in the morning."'
      },
      {
        id: 7,
        questionText: 'How early should the patient arrive?',
        questionType: 'completion',
        correctAnswer: '10 minutes',
        acceptableAnswers: ['10', 'ten minutes', '10 mins'],
        audioTimestamp: 92,
        explanation: 'The receptionist says "Please arrive 10 minutes early to complete any paperwork."'
      }
    ],
    createdAt: new Date()
  },

  // ===================================
  // Section 2 - Monologues (Social)
  // ===================================
  {
    id: 'l2-museum-tour',
    title: 'Museum Tour Information',
    section: 'section2',
    topic: 'Culture & Tourism',
    difficulty: 'medium',
    transcript: `
Good morning, everyone, and welcome to the National History Museum. My name is Rebecca, and I'll be your guide today.

Before we begin our tour, let me give you some important information. The museum is open from 9 AM to 6 PM, Monday to Saturday, and from 10 AM to 5 PM on Sundays. We're closed on Christmas Day and New Year's Day only.

Our tour today will last approximately two hours and will cover the main highlights of the museum. We'll start here in the main entrance hall, then move to the Egyptian Gallery on the first floor, followed by the Natural History section on the second floor. We'll finish in the Modern Art wing on the third floor.

Please note that photography is allowed in most areas of the museum, but flash photography is prohibited to protect the artifacts. Also, food and drinks are only permitted in the cafeteria on the ground floor.

Speaking of the cafeteria, it offers a wide range of refreshments. It's open from 10 AM until 5 PM. I recommend their homemade soup and sandwiches – they're excellent!

For those interested in purchasing souvenirs, our gift shop is located near the main exit. They have a wonderful selection of books, postcards, and replicas of some of our most famous exhibits.

Now, if anyone needs to use the facilities, the restrooms are located on every floor, next to the elevators. There are also baby changing facilities available on the ground floor and second floor.

Before we begin, I should mention that our audio guides are available in eight languages: English, Spanish, French, German, Italian, Japanese, Chinese, and Arabic. They cost 5 pounds and can be collected from the information desk.

Finally, please keep your belongings with you at all times. Large bags and backpacks must be left in the cloakroom. This is free of charge.

Does anyone have any questions before we start? No? Wonderful. Let's begin our journey through history!
    `.trim(),
    audioText: `Good morning, everyone, and welcome to the National History Museum. My name is Rebecca, and I'll be your guide today.

Before we begin our tour, let me give you some important information. The museum is open from 9 AM to 6 PM, Monday to Saturday, and from 10 AM to 5 PM on Sundays. We're closed on Christmas Day and New Year's Day only.

Our tour today will last approximately two hours and will cover the main highlights of the museum. We'll start here in the main entrance hall, then move to the Egyptian Gallery on the first floor, followed by the Natural History section on the second floor. We'll finish in the Modern Art wing on the third floor.

Please note that photography is allowed in most areas of the museum, but flash photography is prohibited to protect the artifacts. Also, food and drinks are only permitted in the cafeteria on the ground floor.

Speaking of the cafeteria, it offers a wide range of refreshments. It's open from 10 AM until 5 PM. I recommend their homemade soup and sandwiches – they're excellent!

For those interested in purchasing souvenirs, our gift shop is located near the main exit. They have a wonderful selection of books, postcards, and replicas of some of our most famous exhibits.

Now, if anyone needs to use the facilities, the restrooms are located on every floor, next to the elevators. There are also baby changing facilities available on the ground floor and second floor.

Before we begin, I should mention that our audio guides are available in eight languages: English, Spanish, French, German, Italian, Japanese, Chinese, and Arabic. They cost 5 pounds and can be collected from the information desk.

Finally, please keep your belongings with you at all times. Large bags and backpacks must be left in the cloakroom. This is free of charge.`,
    duration: 150,
    questions: [
      {
        id: 1,
        questionText: 'What are the Sunday opening hours?',
        questionType: 'completion',
        correctAnswer: '10 AM to 5 PM',
        acceptableAnswers: ['10 to 5', '10am-5pm', '10:00-17:00'],
        audioTimestamp: 20,
        explanation: 'The guide says "from 10 AM to 5 PM on Sundays."'
      },
      {
        id: 2,
        questionText: 'How long will the tour last?',
        questionType: 'multiple_choice',
        options: [
          { letter: 'A', text: 'One hour' },
          { letter: 'B', text: 'One and a half hours' },
          { letter: 'C', text: 'Two hours' },
          { letter: 'D', text: 'Three hours' }
        ],
        correctAnswer: 'C',
        audioTimestamp: 35,
        explanation: 'The guide states "Our tour today will last approximately two hours."'
      },
      {
        id: 3,
        questionText: 'Which gallery is on the first floor?',
        questionType: 'completion',
        correctAnswer: 'Egyptian',
        acceptableAnswers: ['Egyptian Gallery', 'the Egyptian Gallery'],
        audioTimestamp: 45,
        explanation: 'The guide mentions "the Egyptian Gallery on the first floor."'
      },
      {
        id: 4,
        questionText: 'Where is food and drink allowed?',
        questionType: 'multiple_choice',
        options: [
          { letter: 'A', text: 'Everywhere in the museum' },
          { letter: 'B', text: 'Only in the cafeteria' },
          { letter: 'C', text: 'In the Egyptian Gallery' },
          { letter: 'D', text: 'Near the gift shop' }
        ],
        correctAnswer: 'B',
        audioTimestamp: 65,
        explanation: 'The guide says "food and drinks are only permitted in the cafeteria on the ground floor."'
      },
      {
        id: 5,
        questionText: 'How much do audio guides cost?',
        questionType: 'completion',
        correctAnswer: '5 pounds',
        acceptableAnswers: ['5', '£5', 'five pounds'],
        audioTimestamp: 115,
        explanation: 'The guide states "They cost 5 pounds."'
      },
      {
        id: 6,
        questionText: 'In how many languages are audio guides available?',
        questionType: 'completion',
        correctAnswer: '8',
        acceptableAnswers: ['eight', '8 languages'],
        audioTimestamp: 110,
        explanation: 'The guide mentions "audio guides are available in eight languages."'
      },
      {
        id: 7,
        questionText: 'What must be left in the cloakroom?',
        questionType: 'multiple_choice',
        options: [
          { letter: 'A', text: 'All personal belongings' },
          { letter: 'B', text: 'Cameras' },
          { letter: 'C', text: 'Large bags and backpacks' },
          { letter: 'D', text: 'Coats only' }
        ],
        correctAnswer: 'C',
        audioTimestamp: 130,
        explanation: 'The guide says "Large bags and backpacks must be left in the cloakroom."'
      }
    ],
    createdAt: new Date()
  },

  // ===================================
  // Section 3 - Academic Discussions
  // ===================================
  {
    id: 'l3-research-project',
    title: 'University Research Project Discussion',
    section: 'section3',
    topic: 'Education & Research',
    difficulty: 'medium',
    transcript: `
Tutor: So, Emma and Jack, how is your research project coming along?

Emma: Well, Professor Williams, we've made good progress on the literature review, but we're still deciding on our methodology.

Jack: Yes, we've been debating whether to use quantitative or qualitative methods.

Tutor: I see. Tell me more about what you're considering.

Emma: Well, originally we thought about conducting surveys with university students about their study habits. That would give us quantitative data.

Jack: But then we realized that interviews might give us deeper insights into why students choose certain study methods.

Tutor: Both approaches have merits. Have you considered a mixed-methods approach?

Emma: Actually, yes. We were thinking we could start with interviews to explore the topic, then design a survey based on what we learn.

Tutor: That's a sound approach. How many participants are you planning to include?

Jack: For the interviews, we're thinking around 15 to 20 students from different departments.

Emma: And for the survey, we're aiming for at least 200 responses to have statistical significance.

Tutor: That's ambitious but achievable. What's your timeline looking like?

Jack: We plan to complete the interviews by the end of October. That gives us three weeks.

Emma: Then we'll spend two weeks analyzing the interview data and designing the survey. We're hoping to launch the survey in mid-November.

Tutor: And when do you need to submit the final report?

Emma: December 15th. So we'll have about three weeks for the survey responses and final analysis.

Tutor: That's quite tight. Make sure you allow time for unexpected delays. What about ethical approval?

Jack: We submitted our ethics application last week. We're waiting for approval.

Tutor: Good. That usually takes about ten days. Any other concerns?

Emma: We're a bit worried about getting enough survey responses. Do you have any suggestions?

Tutor: You might consider offering a small incentive – maybe entry into a prize draw. Also, sending reminders after a week usually helps increase response rates.

Jack: That's a great idea. We'll look into that.

Tutor: Excellent. Let's schedule another meeting for two weeks from now to check on your progress.
    `.trim(),
    audioText: `So, Emma and Jack, how is your research project coming along?

Well, Professor Williams, we've made good progress on the literature review, but we're still deciding on our methodology.

Yes, we've been debating whether to use quantitative or qualitative methods.

I see. Tell me more about what you're considering.

Well, originally we thought about conducting surveys with university students about their study habits. That would give us quantitative data.

But then we realized that interviews might give us deeper insights into why students choose certain study methods.

Both approaches have merits. Have you considered a mixed-methods approach?

Actually, yes. We were thinking we could start with interviews to explore the topic, then design a survey based on what we learn.

That's a sound approach. How many participants are you planning to include?

For the interviews, we're thinking around 15 to 20 students from different departments.

And for the survey, we're aiming for at least 200 responses to have statistical significance.

That's ambitious but achievable. What's your timeline looking like?

We plan to complete the interviews by the end of October. That gives us three weeks.

Then we'll spend two weeks analyzing the interview data and designing the survey. We're hoping to launch the survey in mid-November.

And when do you need to submit the final report?

December 15th. So we'll have about three weeks for the survey responses and final analysis.

That's quite tight. Make sure you allow time for unexpected delays. What about ethical approval?

We submitted our ethics application last week. We're waiting for approval.

Good. That usually takes about ten days. Any other concerns?

We're a bit worried about getting enough survey responses. Do you have any suggestions?

You might consider offering a small incentive – maybe entry into a prize draw. Also, sending reminders after a week usually helps increase response rates.`,
    duration: 170,
    questions: [
      {
        id: 1,
        questionText: 'What research methodology do Emma and Jack decide to use?',
        questionType: 'multiple_choice',
        options: [
          { letter: 'A', text: 'Only quantitative methods' },
          { letter: 'B', text: 'Only qualitative methods' },
          { letter: 'C', text: 'Mixed methods' },
          { letter: 'D', text: 'Case study approach' }
        ],
        correctAnswer: 'C',
        audioTimestamp: 50,
        explanation: 'They discuss using a mixed-methods approach, starting with interviews then conducting a survey.'
      },
      {
        id: 2,
        questionText: 'How many students do they plan to interview?',
        questionType: 'completion',
        correctAnswer: '15-20',
        acceptableAnswers: ['15 to 20', 'fifteen to twenty', '15-20 students', 'around 15 to 20'],
        audioTimestamp: 70,
        explanation: 'Jack says "For the interviews, we\'re thinking around 15 to 20 students."'
      },
      {
        id: 3,
        questionText: 'What is their target number of survey responses?',
        questionType: 'completion',
        correctAnswer: '200',
        acceptableAnswers: ['at least 200', '200 responses', 'two hundred'],
        audioTimestamp: 78,
        explanation: 'Emma states "we\'re aiming for at least 200 responses."'
      },
      {
        id: 4,
        questionText: 'When do they plan to finish the interviews?',
        questionType: 'multiple_choice',
        options: [
          { letter: 'A', text: 'End of September' },
          { letter: 'B', text: 'End of October' },
          { letter: 'C', text: 'Mid-November' },
          { letter: 'D', text: 'December 15th' }
        ],
        correctAnswer: 'B',
        audioTimestamp: 88,
        explanation: 'Jack says "We plan to complete the interviews by the end of October."'
      },
      {
        id: 5,
        questionText: 'When is the final report deadline?',
        questionType: 'completion',
        correctAnswer: 'December 15th',
        acceptableAnswers: ['December 15', '15th December', '15 December', 'Dec 15'],
        audioTimestamp: 105,
        explanation: 'Emma states "December 15th."'
      },
      {
        id: 6,
        questionText: 'How long does ethics approval usually take?',
        questionType: 'completion',
        correctAnswer: '10 days',
        acceptableAnswers: ['ten days', 'about ten days', 'around 10 days'],
        audioTimestamp: 125,
        explanation: 'The tutor says "That usually takes about ten days."'
      },
      {
        id: 7,
        questionText: 'What incentive does the tutor suggest for increasing survey responses?',
        questionType: 'multiple_choice',
        options: [
          { letter: 'A', text: 'Money payment' },
          { letter: 'B', text: 'Entry into a prize draw' },
          { letter: 'C', text: 'Free lunch' },
          { letter: 'D', text: 'Extra course credits' }
        ],
        correctAnswer: 'B',
        audioTimestamp: 140,
        explanation: 'The tutor suggests "offering a small incentive – maybe entry into a prize draw."'
      }
    ],
    createdAt: new Date()
  },

  // ===================================
  // Section 4 - Academic Lectures
  // ===================================
  {
    id: 'l4-climate-change',
    title: 'Climate Change and Ocean Ecosystems',
    section: 'section4',
    topic: 'Environmental Science',
    difficulty: 'hard',
    transcript: `
Today, I want to discuss the impact of climate change on marine ecosystems, specifically focusing on coral reefs. Coral reefs are often called the "rainforests of the sea" because, despite covering less than one percent of the ocean floor, they support approximately 25 percent of all marine species.

The primary threat to coral reefs is a phenomenon known as coral bleaching. This occurs when water temperatures rise above the normal range – even a temperature increase of just one degree Celsius can trigger bleaching events. When corals become stressed by heat, they expel the symbiotic algae living in their tissues, causing them to turn completely white – hence the term "bleaching."

The Great Barrier Reef in Australia has experienced mass bleaching events in 2016, 2017, 2020, and 2022. Studies indicate that approximately 50 percent of the reef's coral cover has been lost since 1995. This is particularly alarming because the Great Barrier Reef is the world's largest coral reef system, stretching over 2,300 kilometers.

But temperature isn't the only factor affecting coral reefs. Ocean acidification is equally concerning. The ocean absorbs about 30 percent of the carbon dioxide produced by human activities. When CO2 dissolves in seawater, it forms carbonic acid, which lowers the ocean's pH. Since pre-industrial times, ocean pH has decreased by 0.1 units, representing a 30 percent increase in acidity.

This acidification makes it harder for corals to build their calcium carbonate skeletons. Research suggests that if current trends continue, coral calcification rates could decline by 40 percent by the end of this century.

What can be done? Scientists are exploring several approaches. One involves assisted evolution – breeding corals that are more resistant to higher temperatures. Researchers in Hawaii have successfully bred "super corals" that can survive in warmer waters. Another approach involves reducing local stressors like pollution and overfishing, which can help reefs recover from bleaching events more quickly.

There's also growing interest in coral restoration projects. In Florida, scientists have grown over 100,000 corals in nurseries and transplanted them onto damaged reefs. While these efforts show promise, they're unlikely to save coral reefs without significant reductions in greenhouse gas emissions globally.

In my next lecture, we'll examine the economic implications of reef degradation and discuss the concept of ecosystem services in more detail.
    `.trim(),
    audioText: `Today, I want to discuss the impact of climate change on marine ecosystems, specifically focusing on coral reefs. Coral reefs are often called the "rainforests of the sea" because, despite covering less than one percent of the ocean floor, they support approximately 25 percent of all marine species.

The primary threat to coral reefs is a phenomenon known as coral bleaching. This occurs when water temperatures rise above the normal range – even a temperature increase of just one degree Celsius can trigger bleaching events. When corals become stressed by heat, they expel the symbiotic algae living in their tissues, causing them to turn completely white – hence the term "bleaching."

The Great Barrier Reef in Australia has experienced mass bleaching events in 2016, 2017, 2020, and 2022. Studies indicate that approximately 50 percent of the reef's coral cover has been lost since 1995. This is particularly alarming because the Great Barrier Reef is the world's largest coral reef system, stretching over 2,300 kilometers.

But temperature isn't the only factor affecting coral reefs. Ocean acidification is equally concerning. The ocean absorbs about 30 percent of the carbon dioxide produced by human activities. When CO2 dissolves in seawater, it forms carbonic acid, which lowers the ocean's pH. Since pre-industrial times, ocean pH has decreased by 0.1 units, representing a 30 percent increase in acidity.

This acidification makes it harder for corals to build their calcium carbonate skeletons. Research suggests that if current trends continue, coral calcification rates could decline by 40 percent by the end of this century.

What can be done? Scientists are exploring several approaches. One involves assisted evolution – breeding corals that are more resistant to higher temperatures. Researchers in Hawaii have successfully bred "super corals" that can survive in warmer waters. Another approach involves reducing local stressors like pollution and overfishing, which can help reefs recover from bleaching events more quickly.

There's also growing interest in coral restoration projects. In Florida, scientists have grown over 100,000 corals in nurseries and transplanted them onto damaged reefs.`,
    duration: 200,
    questions: [
      {
        id: 1,
        questionText: 'What percentage of marine species do coral reefs support?',
        questionType: 'completion',
        correctAnswer: '25',
        acceptableAnswers: ['25%', '25 percent', 'approximately 25 percent', 'about 25%'],
        audioTimestamp: 15,
        explanation: 'The lecturer states they "support approximately 25 percent of all marine species."'
      },
      {
        id: 2,
        questionText: 'What temperature increase can trigger coral bleaching?',
        questionType: 'multiple_choice',
        options: [
          { letter: 'A', text: '0.5 degrees Celsius' },
          { letter: 'B', text: '1 degree Celsius' },
          { letter: 'C', text: '2 degrees Celsius' },
          { letter: 'D', text: '5 degrees Celsius' }
        ],
        correctAnswer: 'B',
        audioTimestamp: 35,
        explanation: 'The lecturer says "even a temperature increase of just one degree Celsius can trigger bleaching events."'
      },
      {
        id: 3,
        questionText: 'How much of the Great Barrier Reef coral cover has been lost since 1995?',
        questionType: 'completion',
        correctAnswer: '50',
        acceptableAnswers: ['50%', '50 percent', 'approximately 50 percent'],
        audioTimestamp: 55,
        explanation: 'The lecturer states "approximately 50 percent of the reef\'s coral cover has been lost since 1995."'
      },
      {
        id: 4,
        questionText: 'How long is the Great Barrier Reef?',
        questionType: 'completion',
        correctAnswer: '2300 km',
        acceptableAnswers: ['2,300 kilometers', '2300 kilometers', 'over 2300 km', '2,300 km'],
        audioTimestamp: 65,
        explanation: 'It is described as "stretching over 2,300 kilometers."'
      },
      {
        id: 5,
        questionText: 'What percentage of human-produced CO2 does the ocean absorb?',
        questionType: 'multiple_choice',
        options: [
          { letter: 'A', text: '10 percent' },
          { letter: 'B', text: '20 percent' },
          { letter: 'C', text: '30 percent' },
          { letter: 'D', text: '50 percent' }
        ],
        correctAnswer: 'C',
        audioTimestamp: 80,
        explanation: 'The lecturer states "The ocean absorbs about 30 percent of the carbon dioxide."'
      },
      {
        id: 6,
        questionText: 'By how much has ocean acidity increased since pre-industrial times?',
        questionType: 'completion',
        correctAnswer: '30',
        acceptableAnswers: ['30%', '30 percent', 'a 30 percent increase'],
        audioTimestamp: 95,
        explanation: 'The lecturer mentions "a 30 percent increase in acidity."'
      },
      {
        id: 7,
        questionText: 'By what percentage could coral calcification decline by 2100?',
        questionType: 'completion',
        correctAnswer: '40',
        acceptableAnswers: ['40%', '40 percent', 'by 40 percent'],
        audioTimestamp: 110,
        explanation: 'Research suggests "coral calcification rates could decline by 40 percent by the end of this century."'
      },
      {
        id: 8,
        questionText: 'Where have researchers successfully bred temperature-resistant "super corals"?',
        questionType: 'multiple_choice',
        options: [
          { letter: 'A', text: 'Australia' },
          { letter: 'B', text: 'Florida' },
          { letter: 'C', text: 'Hawaii' },
          { letter: 'D', text: 'Indonesia' }
        ],
        correctAnswer: 'C',
        audioTimestamp: 135,
        explanation: 'The lecturer mentions "Researchers in Hawaii have successfully bred super corals."'
      },
      {
        id: 9,
        questionText: 'How many corals have Florida scientists grown in nurseries?',
        questionType: 'completion',
        correctAnswer: '100000',
        acceptableAnswers: ['100,000', 'over 100,000', 'more than 100000', '100000 corals'],
        audioTimestamp: 160,
        explanation: 'The lecturer states "scientists have grown over 100,000 corals in nurseries."'
      }
    ],
    createdAt: new Date()
  },

  {
    id: 'l4-psychology-memory',
    title: 'The Science of Human Memory',
    section: 'section4',
    topic: 'Psychology',
    difficulty: 'hard',
    transcript: `
This lecture will explore the fascinating science of human memory – how we encode, store, and retrieve information. Understanding memory is crucial not only for psychologists but for anyone interested in improving their learning abilities.

Memory is not a single system but consists of multiple interconnected systems. The most widely accepted model, proposed by Atkinson and Shiffrin in 1968, distinguishes between three stages: sensory memory, short-term memory, and long-term memory.

Sensory memory is the initial stage that holds information from our senses for a very brief period – typically less than one second for visual information and about three to four seconds for auditory information. This allows us to retain impressions of sensory information after the original stimulus has ended.

Short-term memory, also called working memory, has limited capacity. The psychologist George Miller famously described this as "the magical number seven, plus or minus two." This means most people can hold between five and nine items in their short-term memory at any given time. Without rehearsal, information typically remains in short-term memory for about 20 to 30 seconds.

Long-term memory, in contrast, has virtually unlimited capacity and can store information for a lifetime. However, it's not a single monolithic system. We distinguish between explicit memory – which includes episodic memory for personal experiences and semantic memory for facts and concepts – and implicit memory, which involves skills and conditioned responses.

One of the most important discoveries in memory research was made by Hermann Ebbinghaus in the 1880s. He demonstrated what we now call the "forgetting curve" – the rate at which we forget newly learned information. His research showed that we forget approximately 50 percent of new information within the first hour, and up to 70 percent within 24 hours.

However, Ebbinghaus also discovered that this decline can be counteracted through spaced repetition. When we review information at gradually increasing intervals, retention improves dramatically. Modern research suggests that reviewing material after one day, then one week, then one month, can help transfer information from short-term to long-term memory.

Another crucial concept is elaborative encoding – the process of relating new information to existing knowledge. Studies show that information processed at a deeper level, with more meaningful connections, is remembered better than information processed superficially. This is why understanding concepts is more effective than simple memorization.

Sleep also plays a vital role in memory consolidation. During sleep, particularly during REM sleep and slow-wave sleep, the brain replays and strengthens neural connections formed during waking hours. Research indicates that getting seven to eight hours of sleep can improve memory retention by up to 40 percent compared to staying awake.
    `.trim(),
    audioText: `This lecture will explore the fascinating science of human memory – how we encode, store, and retrieve information. Understanding memory is crucial not only for psychologists but for anyone interested in improving their learning abilities.

Memory is not a single system but consists of multiple interconnected systems. The most widely accepted model, proposed by Atkinson and Shiffrin in 1968, distinguishes between three stages: sensory memory, short-term memory, and long-term memory.

Sensory memory is the initial stage that holds information from our senses for a very brief period – typically less than one second for visual information and about three to four seconds for auditory information.

Short-term memory, also called working memory, has limited capacity. The psychologist George Miller famously described this as "the magical number seven, plus or minus two." This means most people can hold between five and nine items in their short-term memory at any given time. Without rehearsal, information typically remains in short-term memory for about 20 to 30 seconds.

Long-term memory, in contrast, has virtually unlimited capacity and can store information for a lifetime.

One of the most important discoveries in memory research was made by Hermann Ebbinghaus in the 1880s. He demonstrated what we now call the "forgetting curve." His research showed that we forget approximately 50 percent of new information within the first hour, and up to 70 percent within 24 hours.

However, Ebbinghaus also discovered that this decline can be counteracted through spaced repetition. Modern research suggests that reviewing material after one day, then one week, then one month, can help transfer information from short-term to long-term memory.

Sleep also plays a vital role in memory consolidation. Research indicates that getting seven to eight hours of sleep can improve memory retention by up to 40 percent compared to staying awake.`,
    duration: 210,
    questions: [
      {
        id: 1,
        questionText: 'When was the three-stage memory model proposed?',
        questionType: 'completion',
        correctAnswer: '1968',
        acceptableAnswers: ['in 1968'],
        audioTimestamp: 25,
        explanation: 'The model was "proposed by Atkinson and Shiffrin in 1968."'
      },
      {
        id: 2,
        questionText: 'How long does sensory memory hold visual information?',
        questionType: 'multiple_choice',
        options: [
          { letter: 'A', text: 'Less than one second' },
          { letter: 'B', text: 'About 3-4 seconds' },
          { letter: 'C', text: 'About 20-30 seconds' },
          { letter: 'D', text: 'About one minute' }
        ],
        correctAnswer: 'A',
        audioTimestamp: 45,
        explanation: 'The lecturer states "typically less than one second for visual information."'
      },
      {
        id: 3,
        questionText: 'What is George Miller\'s "magical number"?',
        questionType: 'completion',
        correctAnswer: '7',
        acceptableAnswers: ['seven', '7 plus or minus 2', 'seven plus or minus two'],
        audioTimestamp: 65,
        explanation: 'Miller described it as "the magical number seven, plus or minus two."'
      },
      {
        id: 4,
        questionText: 'How long does information stay in short-term memory without rehearsal?',
        questionType: 'completion',
        correctAnswer: '20-30 seconds',
        acceptableAnswers: ['20 to 30 seconds', 'about 20 to 30 seconds', '20-30 secs'],
        audioTimestamp: 80,
        explanation: 'The lecturer states "about 20 to 30 seconds."'
      },
      {
        id: 5,
        questionText: 'What percentage of new information is forgotten within the first hour?',
        questionType: 'multiple_choice',
        options: [
          { letter: 'A', text: '30 percent' },
          { letter: 'B', text: '50 percent' },
          { letter: 'C', text: '70 percent' },
          { letter: 'D', text: '90 percent' }
        ],
        correctAnswer: 'B',
        audioTimestamp: 120,
        explanation: 'Ebbinghaus showed "we forget approximately 50 percent of new information within the first hour."'
      },
      {
        id: 6,
        questionText: 'What percentage is forgotten within 24 hours?',
        questionType: 'completion',
        correctAnswer: '70',
        acceptableAnswers: ['70%', '70 percent', 'up to 70 percent'],
        audioTimestamp: 125,
        explanation: 'The lecturer states "up to 70 percent within 24 hours."'
      },
      {
        id: 7,
        questionText: 'What technique helps counteract the forgetting curve?',
        questionType: 'multiple_choice',
        options: [
          { letter: 'A', text: 'Intense cramming' },
          { letter: 'B', text: 'Spaced repetition' },
          { letter: 'C', text: 'Speed reading' },
          { letter: 'D', text: 'Group discussion' }
        ],
        correctAnswer: 'B',
        audioTimestamp: 140,
        explanation: 'The lecturer mentions "spaced repetition" as the technique to counteract forgetting.'
      },
      {
        id: 8,
        questionText: 'By how much can adequate sleep improve memory retention?',
        questionType: 'completion',
        correctAnswer: '40',
        acceptableAnswers: ['40%', '40 percent', 'up to 40 percent'],
        audioTimestamp: 190,
        explanation: 'The research indicates sleep "can improve memory retention by up to 40 percent."'
      }
    ],
    createdAt: new Date()
  }
];

// Get tests by section
export const getListeningTestsBySection = (section: IELTSListeningSection): ListeningTest[] => {
  return listeningTests.filter(t => t.section === section);
};

// Get a random test from a specific section
export const getRandomListeningTest = (section?: IELTSListeningSection): ListeningTest => {
  const tests = section ? getListeningTestsBySection(section) : listeningTests;
  return tests[Math.floor(Math.random() * tests.length)];
};

// Get tests by difficulty
export const getListeningTestsByDifficulty = (difficulty: string): ListeningTest[] => {
  return listeningTests.filter(t => t.difficulty === difficulty);
};

// Get test by ID
export const getListeningTestById = (testId: string): ListeningTest | undefined => {
  return listeningTests.find(t => t.id === testId);
};










