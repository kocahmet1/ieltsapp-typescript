import { SpeakingQuestion } from '../types';

export const ieltsQuestions: SpeakingQuestion[] = [
  // ===================================
  // Section 1 - Introduction & Interview
  // ===================================
  
  // Work & Studies
  {
    id: 's1-work-1',
    section: 'section1',
    topic: 'Work',
    questionText: 'Do you work or are you a student?',
    followUpQuestions: [
      'What do you do in your job?',
      'Why did you choose this career?',
      'What do you like most about your work?'
    ],
    speakingTime: 30,
    difficulty: 'easy'
  },
  {
    id: 's1-work-2',
    section: 'section1',
    topic: 'Work',
    questionText: 'What are your main responsibilities at work?',
    followUpQuestions: [
      'Do you enjoy your work?',
      'Would you like to change your job in the future?'
    ],
    speakingTime: 30,
    difficulty: 'easy'
  },
  {
    id: 's1-studies-1',
    section: 'section1',
    topic: 'Studies',
    questionText: 'What subject are you studying?',
    followUpQuestions: [
      'Why did you choose this subject?',
      'What do you find most interesting about it?',
      'What would you like to do after you finish your studies?'
    ],
    speakingTime: 30,
    difficulty: 'easy'
  },
  
  // Home & Accommodation
  {
    id: 's1-home-1',
    section: 'section1',
    topic: 'Home',
    questionText: 'Can you describe your home?',
    followUpQuestions: [
      'What is your favorite room?',
      'How long have you lived there?',
      'Would you like to move to a different place?'
    ],
    speakingTime: 30,
    difficulty: 'easy'
  },
  {
    id: 's1-home-2',
    section: 'section1',
    topic: 'Home',
    questionText: 'Do you live in a house or an apartment?',
    followUpQuestions: [
      'What do you like about where you live?',
      'Is there anything you would change about your home?'
    ],
    speakingTime: 30,
    difficulty: 'easy'
  },
  
  // Hometown
  {
    id: 's1-hometown-1',
    section: 'section1',
    topic: 'Hometown',
    questionText: 'Where is your hometown?',
    followUpQuestions: [
      'What do you like about it?',
      'Has your hometown changed much in recent years?',
      'Would you recommend tourists visit your hometown?'
    ],
    speakingTime: 30,
    difficulty: 'easy'
  },
  {
    id: 's1-hometown-2',
    section: 'section1',
    topic: 'Hometown',
    questionText: 'What is the best thing about your hometown?',
    followUpQuestions: [
      'Is it a good place for young people?',
      'What facilities are available there?'
    ],
    speakingTime: 30,
    difficulty: 'easy'
  },
  
  // Family
  {
    id: 's1-family-1',
    section: 'section1',
    topic: 'Family',
    questionText: 'Can you tell me about your family?',
    followUpQuestions: [
      'Who are you closest to in your family?',
      'Do you spend much time with your family?',
      'What activities do you do together?'
    ],
    speakingTime: 30,
    difficulty: 'easy'
  },
  
  // Hobbies & Free Time
  {
    id: 's1-hobbies-1',
    section: 'section1',
    topic: 'Hobbies',
    questionText: 'What do you do in your free time?',
    followUpQuestions: [
      'How did you become interested in this hobby?',
      'Do you prefer indoor or outdoor activities?',
      'Is there a new hobby you would like to try?'
    ],
    speakingTime: 30,
    difficulty: 'easy'
  },
  {
    id: 's1-hobbies-2',
    section: 'section1',
    topic: 'Hobbies',
    questionText: 'Do you have any hobbies?',
    followUpQuestions: [
      'How much time do you spend on your hobbies?',
      'Do you think hobbies are important?'
    ],
    speakingTime: 30,
    difficulty: 'easy'
  },
  
  // Technology
  {
    id: 's1-tech-1',
    section: 'section1',
    topic: 'Technology',
    questionText: 'How often do you use the internet?',
    followUpQuestions: [
      'What do you mainly use the internet for?',
      'Do you think the internet has changed people\'s lives?',
      'What are the advantages and disadvantages of the internet?'
    ],
    speakingTime: 30,
    difficulty: 'easy'
  },
  {
    id: 's1-tech-2',
    section: 'section1',
    topic: 'Technology',
    questionText: 'Do you use social media?',
    followUpQuestions: [
      'Which social media platforms do you use most?',
      'What do you think about social media?'
    ],
    speakingTime: 30,
    difficulty: 'medium'
  },
  
  // Food
  {
    id: 's1-food-1',
    section: 'section1',
    topic: 'Food',
    questionText: 'What is your favorite food?',
    followUpQuestions: [
      'Do you often eat at restaurants?',
      'Do you like cooking?',
      'What food from your country would you recommend to visitors?'
    ],
    speakingTime: 30,
    difficulty: 'easy'
  },
  
  // Travel
  {
    id: 's1-travel-1',
    section: 'section1',
    topic: 'Travel',
    questionText: 'Do you like traveling?',
    followUpQuestions: [
      'Where was the last place you visited?',
      'Do you prefer traveling alone or with others?',
      'Where would you like to travel in the future?'
    ],
    speakingTime: 30,
    difficulty: 'easy'
  },
  
  // Weather
  {
    id: 's1-weather-1',
    section: 'section1',
    topic: 'Weather',
    questionText: 'What kind of weather do you like?',
    followUpQuestions: [
      'Does the weather affect your mood?',
      'What is the weather like in your country?',
      'Do you check the weather forecast?'
    ],
    speakingTime: 30,
    difficulty: 'easy'
  },
  
  // ===================================
  // Section 2 - Long Turn (Cue Card)
  // ===================================
  
  {
    id: 's2-person-1',
    section: 'section2',
    topic: 'Describe a Person',
    questionText: 'Describe a person who has influenced you in your life.',
    cueCardPoints: [
      'Who this person is',
      'How you know this person',
      'What qualities this person has',
      'Explain how this person has influenced you'
    ],
    preparationTime: 60,
    speakingTime: 120,
    difficulty: 'medium'
  },
  {
    id: 's2-person-2',
    section: 'section2',
    topic: 'Describe a Person',
    questionText: 'Describe a teacher who has had a significant impact on your education.',
    cueCardPoints: [
      'Who this teacher was',
      'What subject they taught',
      'What made them special',
      'Explain how they influenced your learning'
    ],
    preparationTime: 60,
    speakingTime: 120,
    difficulty: 'medium'
  },
  {
    id: 's2-place-1',
    section: 'section2',
    topic: 'Describe a Place',
    questionText: 'Describe a place you would like to visit in the future.',
    cueCardPoints: [
      'Where this place is',
      'What you know about it',
      'What you would do there',
      'Explain why you want to visit this place'
    ],
    preparationTime: 60,
    speakingTime: 120,
    difficulty: 'medium'
  },
  {
    id: 's2-place-2',
    section: 'section2',
    topic: 'Describe a Place',
    questionText: 'Describe a city you have visited that impressed you.',
    cueCardPoints: [
      'What city it was and where it is located',
      'When and why you went there',
      'What you did there',
      'Explain what impressed you about this city'
    ],
    preparationTime: 60,
    speakingTime: 120,
    difficulty: 'medium'
  },
  {
    id: 's2-event-1',
    section: 'section2',
    topic: 'Describe an Event',
    questionText: 'Describe a memorable event in your life.',
    cueCardPoints: [
      'What the event was',
      'When and where it happened',
      'Who was there with you',
      'Explain why it was memorable for you'
    ],
    preparationTime: 60,
    speakingTime: 120,
    difficulty: 'medium'
  },
  {
    id: 's2-event-2',
    section: 'section2',
    topic: 'Describe an Event',
    questionText: 'Describe a celebration or festival you have attended.',
    cueCardPoints: [
      'What celebration or festival it was',
      'Where and when it took place',
      'What you did during the celebration',
      'Explain how you felt about the experience'
    ],
    preparationTime: 60,
    speakingTime: 120,
    difficulty: 'medium'
  },
  {
    id: 's2-object-1',
    section: 'section2',
    topic: 'Describe an Object',
    questionText: 'Describe an item you own that is very important to you.',
    cueCardPoints: [
      'What the item is',
      'How you got it',
      'How often you use it',
      'Explain why it is important to you'
    ],
    preparationTime: 60,
    speakingTime: 120,
    difficulty: 'medium'
  },
  {
    id: 's2-skill-1',
    section: 'section2',
    topic: 'Describe a Skill',
    questionText: 'Describe a skill you would like to learn.',
    cueCardPoints: [
      'What skill it is',
      'Why you want to learn it',
      'How you would learn it',
      'Explain how this skill would benefit you'
    ],
    preparationTime: 60,
    speakingTime: 120,
    difficulty: 'medium'
  },
  {
    id: 's2-experience-1',
    section: 'section2',
    topic: 'Describe an Experience',
    questionText: 'Describe a time when you helped someone.',
    cueCardPoints: [
      'Who you helped',
      'What kind of help you provided',
      'What the result was',
      'Explain how you felt about helping this person'
    ],
    preparationTime: 60,
    speakingTime: 120,
    difficulty: 'medium'
  },
  {
    id: 's2-achievement-1',
    section: 'section2',
    topic: 'Describe an Achievement',
    questionText: 'Describe an achievement you are proud of.',
    cueCardPoints: [
      'What you achieved',
      'When this happened',
      'How you achieved it',
      'Explain why you are proud of this achievement'
    ],
    preparationTime: 60,
    speakingTime: 120,
    difficulty: 'hard'
  },
  
  // ===================================
  // Section 3 - Discussion
  // ===================================
  
  {
    id: 's3-education-1',
    section: 'section3',
    topic: 'Education',
    questionText: 'How has education changed in your country over the past few decades?',
    followUpQuestions: [
      'Do you think online learning is as effective as traditional classroom learning?',
      'What role should technology play in education?',
      'How can education systems better prepare students for the future?'
    ],
    speakingTime: 60,
    difficulty: 'hard'
  },
  {
    id: 's3-education-2',
    section: 'section3',
    topic: 'Education',
    questionText: 'What are the advantages and disadvantages of studying abroad?',
    followUpQuestions: [
      'Why do you think many students choose to study in another country?',
      'How can international education benefit a country\'s development?'
    ],
    speakingTime: 60,
    difficulty: 'hard'
  },
  {
    id: 's3-work-1',
    section: 'section3',
    topic: 'Work & Career',
    questionText: 'How do you think the nature of work will change in the future?',
    followUpQuestions: [
      'Do you think automation will create more jobs or reduce employment?',
      'What skills will be most important for workers in the future?',
      'Should companies offer more flexible working arrangements?'
    ],
    speakingTime: 60,
    difficulty: 'hard'
  },
  {
    id: 's3-environment-1',
    section: 'section3',
    topic: 'Environment',
    questionText: 'What do you think individuals can do to help protect the environment?',
    followUpQuestions: [
      'Should governments do more to address environmental issues?',
      'How can businesses become more environmentally responsible?',
      'Do you think climate change can be reversed?'
    ],
    speakingTime: 60,
    difficulty: 'hard'
  },
  {
    id: 's3-technology-1',
    section: 'section3',
    topic: 'Technology',
    questionText: 'How has technology changed the way people communicate?',
    followUpQuestions: [
      'Do you think technology has made communication better or worse?',
      'What are the potential dangers of relying too much on technology?',
      'How might communication technology develop in the future?'
    ],
    speakingTime: 60,
    difficulty: 'hard'
  },
  {
    id: 's3-technology-2',
    section: 'section3',
    topic: 'Technology',
    questionText: 'What impact has social media had on society?',
    followUpQuestions: [
      'Do you think social media platforms should be regulated?',
      'How has social media affected the way businesses operate?'
    ],
    speakingTime: 60,
    difficulty: 'hard'
  },
  {
    id: 's3-culture-1',
    section: 'section3',
    topic: 'Culture & Tradition',
    questionText: 'Why do you think it is important to preserve traditional cultures?',
    followUpQuestions: [
      'How can countries balance modernization with preserving traditions?',
      'Do you think globalization is a threat to local cultures?',
      'What can be done to keep traditional crafts and skills alive?'
    ],
    speakingTime: 60,
    difficulty: 'hard'
  },
  {
    id: 's3-health-1',
    section: 'section3',
    topic: 'Health & Lifestyle',
    questionText: 'What are the main health challenges facing society today?',
    followUpQuestions: [
      'How can governments encourage people to live healthier lives?',
      'Do you think mental health issues are taken seriously enough?',
      'What role should individuals play in maintaining their health?'
    ],
    speakingTime: 60,
    difficulty: 'hard'
  },
  {
    id: 's3-media-1',
    section: 'section3',
    topic: 'Media & News',
    questionText: 'How has the way people consume news changed in recent years?',
    followUpQuestions: [
      'What problems can arise from the spread of misinformation?',
      'Do you think traditional media like newspapers will survive?',
      'How can people ensure they are getting accurate information?'
    ],
    speakingTime: 60,
    difficulty: 'hard'
  },
  {
    id: 's3-travel-1',
    section: 'section3',
    topic: 'Travel & Tourism',
    questionText: 'What are the positive and negative effects of tourism on local communities?',
    followUpQuestions: [
      'How can tourist destinations manage over-tourism?',
      'Do you think eco-tourism is an effective solution?',
      'How has the travel industry been affected by global events?'
    ],
    speakingTime: 60,
    difficulty: 'hard'
  }
];

// Get questions by section
export const getQuestionsBySection = (section: string): SpeakingQuestion[] => {
  return ieltsQuestions.filter(q => q.section === section);
};

// Get a random question from a specific section
export const getRandomQuestion = (section?: string): SpeakingQuestion => {
  const questions = section ? getQuestionsBySection(section) : ieltsQuestions;
  return questions[Math.floor(Math.random() * questions.length)];
};

// Get questions by topic
export const getQuestionsByTopic = (topic: string): SpeakingQuestion[] => {
  return ieltsQuestions.filter(q => q.topic.toLowerCase().includes(topic.toLowerCase()));
};










