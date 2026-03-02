import { ReadingPassage } from '../types';

export const sampleReadingPassages: ReadingPassage[] = [
  {
    id: 'passage_1',
    title: 'The History of Coffee',
    topic: 'History & Culture',
    difficulty: 'Intermediate',
    wordCount: 280,
    estimatedTime: 8,
    passage: `Coffee is one of the most popular beverages in the world, but few people know about its fascinating history. The story of coffee begins in Ethiopia, where legend says a goat herder named Kaldi discovered the energizing effects of coffee beans around 850 AD. He noticed that his goats became unusually energetic after eating berries from a certain tree.

The knowledge of coffee spread to the Arabian Peninsula, where it was first cultivated and traded. By the 15th century, coffee was being grown in Yemen, and coffee houses began appearing throughout the Middle East. These establishments became important social centers where people gathered to discuss politics, business, and culture.

Coffee arrived in Europe in the 17th century and quickly gained popularity, despite initial resistance from some religious groups who called it the "bitter invention of Satan." However, Pope Clement VIII reportedly tasted the beverage and found it so satisfying that he gave it papal approval.

The global coffee industry today is enormous, with over 2.25 billion cups consumed every day worldwide. Brazil is the largest producer, followed by Vietnam and Colombia. Coffee cultivation provides employment for millions of people and represents a significant portion of many countries' export earnings.

Interestingly, coffee contains caffeine, which is a natural stimulant that affects the central nervous system. While moderate coffee consumption has been linked to various health benefits, including improved mental alertness and a reduced risk of certain diseases, excessive intake can lead to sleep problems and anxiety.`,
    questions: [
      {
        id: 1,
        questionText: 'What is the main idea of this passage?',
        questionType: 'main_idea',
        options: [
          { letter: 'A', text: 'Coffee is bad for your health' },
          { letter: 'B', text: 'The history and global significance of coffee' },
          { letter: 'C', text: 'How to grow coffee beans' },
          { letter: 'D', text: 'Coffee houses in the Middle East' }
        ],
        correctAnswer: 'B',
        explanation: 'The passage covers the historical origins of coffee, its spread across the world, and its current global importance, making "The history and global significance of coffee" the best answer for the main idea.'
      },
      {
        id: 2,
        questionText: 'According to the passage, where did coffee originate?',
        questionType: 'detail',
        options: [
          { letter: 'A', text: 'Yemen' },
          { letter: 'B', text: 'Brazil' },
          { letter: 'C', text: 'Ethiopia' },
          { letter: 'D', text: 'Europe' }
        ],
        correctAnswer: 'C',
        explanation: 'The passage states "The story of coffee begins in Ethiopia, where legend says a goat herder named Kaldi discovered the energizing effects of coffee beans."'
      },
      {
        id: 3,
        questionText: 'What can be inferred about coffee houses in the Middle East?',
        questionType: 'inference',
        options: [
          { letter: 'A', text: 'They only served coffee' },
          { letter: 'B', text: 'They were places for intellectual and social exchange' },
          { letter: 'C', text: 'They were unpopular with the public' },
          { letter: 'D', text: 'They were mainly for religious purposes' }
        ],
        correctAnswer: 'B',
        explanation: 'The passage mentions that coffee houses "became important social centers where people gathered to discuss politics, business, and culture," suggesting they were places for intellectual and social exchange.'
      },
      {
        id: 4,
        questionText: 'The word "papal" in paragraph 3 most likely means:',
        questionType: 'vocabulary',
        options: [
          { letter: 'A', text: 'related to paper' },
          { letter: 'B', text: 'related to the Pope' },
          { letter: 'C', text: 'related to food' },
          { letter: 'D', text: 'related to religion in general' }
        ],
        correctAnswer: 'B',
        explanation: '"Papal" refers to something related to the Pope. In context, "Pope Clement VIII... gave it papal approval" means the Pope officially approved of coffee.'
      },
      {
        id: 5,
        questionText: 'Which country is currently the largest coffee producer?',
        questionType: 'detail',
        options: [
          { letter: 'A', text: 'Vietnam' },
          { letter: 'B', text: 'Colombia' },
          { letter: 'C', text: 'Ethiopia' },
          { letter: 'D', text: 'Brazil' }
        ],
        correctAnswer: 'D',
        explanation: 'The passage clearly states "Brazil is the largest producer, followed by Vietnam and Colombia."'
      }
    ],
    createdAt: new Date('2024-01-15')
  },
  {
    id: 'passage_2',
    title: 'Climate Change and Ocean Ecosystems',
    topic: 'Science & Environment',
    difficulty: 'Upper Intermediate',
    wordCount: 320,
    estimatedTime: 10,
    passage: `The world's oceans are experiencing unprecedented changes due to global warming, with far-reaching consequences for marine ecosystems and human communities that depend on them. Rising sea temperatures are causing coral bleaching events, where corals expel the symbiotic algae that give them color and provide essential nutrients. Without these algae, corals turn white and often die, destroying habitats that support approximately 25% of all marine species.

Ocean acidification represents another serious threat. As the ocean absorbs carbon dioxide from the atmosphere, its pH level decreases, making the water more acidic. This process makes it increasingly difficult for shellfish, sea urchins, and other organisms to build and maintain their calcium carbonate shells and skeletons. Scientists estimate that ocean acidity has increased by about 30% since the Industrial Revolution.

Furthermore, warming waters are causing many marine species to migrate toward the poles in search of cooler temperatures. This redistribution of species is disrupting traditional fishing grounds and affecting the livelihoods of coastal communities worldwide. Some species are unable to migrate fast enough or find suitable new habitats, putting them at risk of extinction.

The melting of polar ice caps is contributing to rising sea levels, threatening coastal ecosystems such as mangroves and salt marshes. These habitats serve as crucial nurseries for many fish species and provide natural protection against storms and flooding.

Addressing these challenges requires urgent global action to reduce greenhouse gas emissions. Marine protected areas, sustainable fishing practices, and habitat restoration projects can help ecosystems become more resilient. However, without significant reductions in carbon emissions, the long-term outlook for ocean ecosystems remains deeply concerning.`,
    questions: [
      {
        id: 1,
        questionText: 'What is the author\'s primary purpose in writing this passage?',
        questionType: 'purpose',
        options: [
          { letter: 'A', text: 'To celebrate the beauty of ocean ecosystems' },
          { letter: 'B', text: 'To explain the effects of climate change on oceans' },
          { letter: 'C', text: 'To criticize government environmental policies' },
          { letter: 'D', text: 'To promote tourism to coral reefs' }
        ],
        correctAnswer: 'B',
        explanation: 'The passage systematically explains various ways climate change affects ocean ecosystems, including coral bleaching, acidification, species migration, and rising sea levels.'
      },
      {
        id: 2,
        questionText: 'According to the passage, what percentage of marine species rely on coral reef habitats?',
        questionType: 'detail',
        options: [
          { letter: 'A', text: '15%' },
          { letter: 'B', text: '25%' },
          { letter: 'C', text: '30%' },
          { letter: 'D', text: '50%' }
        ],
        correctAnswer: 'B',
        explanation: 'The passage states that coral reefs "support approximately 25% of all marine species."'
      },
      {
        id: 3,
        questionText: 'The word "symbiotic" in paragraph 1 most likely means:',
        questionType: 'vocabulary',
        options: [
          { letter: 'A', text: 'harmful to both organisms' },
          { letter: 'B', text: 'mutually beneficial relationship' },
          { letter: 'C', text: 'colorful and attractive' },
          { letter: 'D', text: 'temporary and unstable' }
        ],
        correctAnswer: 'B',
        explanation: '"Symbiotic" refers to a mutually beneficial relationship between two organisms. The algae provide nutrients and color to corals, while corals provide a home for the algae.'
      },
      {
        id: 4,
        questionText: 'What can be inferred about ocean acidity levels before the Industrial Revolution?',
        questionType: 'inference',
        options: [
          { letter: 'A', text: 'They were much higher than today' },
          { letter: 'B', text: 'They were approximately 30% lower than today' },
          { letter: 'C', text: 'They were completely stable' },
          { letter: 'D', text: 'They varied greatly by location' }
        ],
        correctAnswer: 'B',
        explanation: 'If ocean acidity has "increased by about 30% since the Industrial Revolution," we can infer that acidity levels before the Industrial Revolution were approximately 30% lower than current levels.'
      },
      {
        id: 5,
        questionText: 'Why are mangroves and salt marshes mentioned in the passage?',
        questionType: 'structure',
        options: [
          { letter: 'A', text: 'To show examples of ecosystems threatened by rising sea levels' },
          { letter: 'B', text: 'To compare them with coral reefs' },
          { letter: 'C', text: 'To explain how fish migrate' },
          { letter: 'D', text: 'To describe their beauty' }
        ],
        correctAnswer: 'A',
        explanation: 'Mangroves and salt marshes are mentioned as examples of "coastal ecosystems" that are threatened by "the melting of polar ice caps... contributing to rising sea levels."'
      },
      {
        id: 6,
        questionText: 'What is the author\'s tone in the final paragraph?',
        questionType: 'tone',
        options: [
          { letter: 'A', text: 'Optimistic and cheerful' },
          { letter: 'B', text: 'Neutral and indifferent' },
          { letter: 'C', text: 'Urgent but hopeful with conditions' },
          { letter: 'D', text: 'Angry and accusatory' }
        ],
        correctAnswer: 'C',
        explanation: 'The author describes "urgent global action" needed and suggests solutions, but notes that "without significant reductions in carbon emissions, the long-term outlook... remains deeply concerning." This is urgent but conditionally hopeful.'
      }
    ],
    createdAt: new Date('2024-01-20')
  },
  {
    id: 'passage_3',
    title: 'The Rise of Remote Work',
    topic: 'Business & Society',
    difficulty: 'Intermediate',
    wordCount: 260,
    estimatedTime: 7,
    passage: `The COVID-19 pandemic dramatically accelerated a trend that had been slowly developing for years: remote work. Before 2020, only about 5% of employees worked from home regularly. By 2022, that number had jumped to over 25% in many developed countries, fundamentally changing how we think about work and workplace culture.

For employees, remote work offers several advantages. The elimination of daily commutes saves time and reduces stress. Many workers report higher productivity when working from home, free from office distractions and interruptions. The flexibility to manage personal responsibilities alongside work commitments has improved work-life balance for many people.

However, remote work is not without its challenges. Some employees struggle with feelings of isolation and miss the social aspects of office life. The boundary between work and personal life can become blurred, leading some to work longer hours than they would in an office. Additionally, younger employees may miss out on mentoring opportunities and the informal learning that occurs in traditional workplaces.

Companies have had to adapt their management practices to support remote teams effectively. This includes investing in digital collaboration tools, developing new methods for measuring productivity, and finding creative ways to maintain company culture across distributed workforces.

Looking ahead, most experts predict a hybrid model will become standard, combining remote work with periodic office attendance. This approach aims to capture the benefits of both arrangements while minimizing their respective drawbacks.`,
    questions: [
      {
        id: 1,
        questionText: 'What is the main topic of this passage?',
        questionType: 'main_idea',
        options: [
          { letter: 'A', text: 'The negative effects of COVID-19' },
          { letter: 'B', text: 'How companies can improve productivity' },
          { letter: 'C', text: 'The growth and implications of remote work' },
          { letter: 'D', text: 'Why office work is better than remote work' }
        ],
        correctAnswer: 'C',
        explanation: 'The passage discusses the rise of remote work, its benefits, challenges, and future predictions, making "The growth and implications of remote work" the best description of the main topic.'
      },
      {
        id: 2,
        questionText: 'According to the passage, what percentage of employees worked from home before 2020?',
        questionType: 'detail',
        options: [
          { letter: 'A', text: 'About 5%' },
          { letter: 'B', text: 'About 15%' },
          { letter: 'C', text: 'About 25%' },
          { letter: 'D', text: 'About 50%' }
        ],
        correctAnswer: 'A',
        explanation: 'The passage clearly states "Before 2020, only about 5% of employees worked from home regularly."'
      },
      {
        id: 3,
        questionText: 'The word "blurred" in paragraph 3 is closest in meaning to:',
        questionType: 'vocabulary',
        options: [
          { letter: 'A', text: 'strengthened' },
          { letter: 'B', text: 'unclear or indistinct' },
          { letter: 'C', text: 'completely removed' },
          { letter: 'D', text: 'carefully defined' }
        ],
        correctAnswer: 'B',
        explanation: '"Blurred" means unclear or indistinct. In context, it describes how the separation between work and personal life becomes less clear when working from home.'
      },
      {
        id: 4,
        questionText: 'What does the passage suggest about younger employees and remote work?',
        questionType: 'inference',
        options: [
          { letter: 'A', text: 'They prefer remote work to office work' },
          { letter: 'B', text: 'They may lose valuable learning opportunities' },
          { letter: 'C', text: 'They are more productive at home' },
          { letter: 'D', text: 'They do not need mentoring' }
        ],
        correctAnswer: 'B',
        explanation: 'The passage states that "younger employees may miss out on mentoring opportunities and the informal learning that occurs in traditional workplaces," suggesting they may lose valuable learning opportunities.'
      },
      {
        id: 5,
        questionText: 'What future work arrangement do experts predict will become standard?',
        questionType: 'detail',
        options: [
          { letter: 'A', text: 'Full-time remote work' },
          { letter: 'B', text: 'Full-time office work' },
          { letter: 'C', text: 'A hybrid model' },
          { letter: 'D', text: 'Shortened work weeks' }
        ],
        correctAnswer: 'C',
        explanation: 'The passage states "most experts predict a hybrid model will become standard, combining remote work with periodic office attendance."'
      }
    ],
    createdAt: new Date('2024-02-01')
  },
  {
    id: 'passage_4',
    title: 'The Psychology of Color',
    topic: 'Psychology & Art',
    difficulty: 'Pre-Intermediate',
    wordCount: 220,
    estimatedTime: 6,
    passage: `Colors can have a powerful effect on our emotions and behavior. This phenomenon, known as color psychology, has been studied by scientists and used by marketers, designers, and artists for many years.

Red is often associated with energy, passion, and excitement. It can increase heart rate and stimulate appetite, which is why many restaurants use red in their decor. However, red can also represent danger or anger.

Blue, on the other hand, tends to have a calming effect. It is frequently used in bedrooms and offices because it can reduce stress and increase productivity. Many technology companies use blue in their logos to appear trustworthy and reliable.

Yellow is the color of sunshine and happiness. It can make people feel cheerful and optimistic. However, too much yellow can cause anxiety or fatigue.

Green represents nature, growth, and harmony. It is easy on the eyes and can create a sense of balance. This is why green is popular in hospitals and schools.

Different cultures may interpret colors differently. For example, while white represents purity in Western cultures, it is associated with mourning in some Asian countries.

Understanding color psychology can help us make better choices in our daily lives, from the clothes we wear to the colors we paint our walls.`,
    questions: [
      {
        id: 1,
        questionText: 'What is the main purpose of this passage?',
        questionType: 'purpose',
        options: [
          { letter: 'A', text: 'To teach readers how to paint' },
          { letter: 'B', text: 'To explain how colors affect people' },
          { letter: 'C', text: 'To sell colorful products' },
          { letter: 'D', text: 'To compare Western and Asian cultures' }
        ],
        correctAnswer: 'B',
        explanation: 'The passage explains the psychological effects of different colors on human emotions and behavior, making "To explain how colors affect people" the correct answer.'
      },
      {
        id: 2,
        questionText: 'Why do many restaurants use red in their decor?',
        questionType: 'detail',
        options: [
          { letter: 'A', text: 'Because red is the cheapest color' },
          { letter: 'B', text: 'Because red can stimulate appetite' },
          { letter: 'C', text: 'Because red makes food look better' },
          { letter: 'D', text: 'Because red is the most popular color' }
        ],
        correctAnswer: 'B',
        explanation: 'The passage states that red "can increase heart rate and stimulate appetite, which is why many restaurants use red in their decor."'
      },
      {
        id: 3,
        questionText: 'According to the passage, which color is best for reducing stress?',
        questionType: 'detail',
        options: [
          { letter: 'A', text: 'Red' },
          { letter: 'B', text: 'Yellow' },
          { letter: 'C', text: 'Blue' },
          { letter: 'D', text: 'Green' }
        ],
        correctAnswer: 'C',
        explanation: 'The passage states that blue "tends to have a calming effect" and "can reduce stress."'
      },
      {
        id: 4,
        questionText: 'What can be inferred about the color white?',
        questionType: 'inference',
        options: [
          { letter: 'A', text: 'It has the same meaning everywhere' },
          { letter: 'B', text: 'Its meaning varies across cultures' },
          { letter: 'C', text: 'It is universally disliked' },
          { letter: 'D', text: 'It has no psychological effect' }
        ],
        correctAnswer: 'B',
        explanation: 'The passage shows that white "represents purity in Western cultures" but "is associated with mourning in some Asian countries," indicating its meaning varies across cultures.'
      }
    ],
    createdAt: new Date('2024-02-10')
  },
  {
    id: 'passage_5',
    title: 'The Future of Artificial Intelligence',
    topic: 'Technology',
    difficulty: 'Advanced',
    wordCount: 350,
    estimatedTime: 12,
    passage: `Artificial intelligence has evolved from a theoretical concept to an integral part of modern life with remarkable speed. Machine learning algorithms now power everything from recommendation systems on streaming platforms to diagnostic tools in healthcare. However, as AI capabilities continue to expand, society faces increasingly complex questions about its development and deployment.

One of the most debated topics is the potential impact of AI on employment. While automation has historically created new jobs even as it eliminated others, some economists argue that AI represents a fundamentally different challenge. Unlike previous technological revolutions, AI threatens not just manual labor but cognitive work as well. Legal research, financial analysis, and even creative tasks like writing and art generation are now being performed by AI systems with varying degrees of success.

Proponents of AI development emphasize its potential to solve pressing global challenges. Climate modeling, drug discovery, and optimization of resource distribution could all benefit from AI's ability to process vast amounts of data and identify patterns invisible to human researchers. In healthcare, AI systems have demonstrated the ability to detect certain cancers earlier than human doctors, potentially saving millions of lives.

However, critics raise legitimate concerns about bias in AI systems, which can perpetuate and even amplify existing social inequalities. When AI is trained on biased data, it produces biased outputs, affecting decisions about loan approvals, job applications, and even criminal sentencing. Furthermore, the concentration of AI development in a handful of large technology companies raises questions about democratic accountability and the distribution of economic benefits.

The development of artificial general intelligence—AI that can match or exceed human cognitive abilities across all domains—remains a subject of intense speculation. Some researchers believe it is decades away, while others argue it may never be achieved. Regardless of timeline, the ethical frameworks we establish today will shape how this transformative technology develops and whose interests it ultimately serves.`,
    questions: [
      {
        id: 1,
        questionText: 'What is the author\'s primary approach to discussing AI in this passage?',
        questionType: 'tone',
        options: [
          { letter: 'A', text: 'Entirely optimistic about AI\'s benefits' },
          { letter: 'B', text: 'Completely opposed to AI development' },
          { letter: 'C', text: 'Balanced, presenting both benefits and concerns' },
          { letter: 'D', text: 'Indifferent to the topic' }
        ],
        correctAnswer: 'C',
        explanation: 'The author presents both "proponents" views about AI solving global challenges and "critics" concerns about bias and inequality, demonstrating a balanced approach.'
      },
      {
        id: 2,
        questionText: 'According to the passage, how is AI different from previous technological revolutions?',
        questionType: 'detail',
        options: [
          { letter: 'A', text: 'It only affects manual labor' },
          { letter: 'B', text: 'It creates more jobs than it eliminates' },
          { letter: 'C', text: 'It threatens cognitive work as well as manual labor' },
          { letter: 'D', text: 'It is developing more slowly' }
        ],
        correctAnswer: 'C',
        explanation: 'The passage states "Unlike previous technological revolutions, AI threatens not just manual labor but cognitive work as well."'
      },
      {
        id: 3,
        questionText: 'The word "perpetuate" in paragraph 4 most likely means:',
        questionType: 'vocabulary',
        options: [
          { letter: 'A', text: 'to eliminate completely' },
          { letter: 'B', text: 'to cause to continue indefinitely' },
          { letter: 'C', text: 'to improve gradually' },
          { letter: 'D', text: 'to study carefully' }
        ],
        correctAnswer: 'B',
        explanation: '"Perpetuate" means to cause something to continue. In context, biased AI systems "perpetuate and even amplify existing social inequalities" means they cause those inequalities to continue and worsen.'
      },
      {
        id: 4,
        questionText: 'What does the passage suggest about artificial general intelligence (AGI)?',
        questionType: 'inference',
        options: [
          { letter: 'A', text: 'It has already been achieved' },
          { letter: 'B', text: 'There is agreement it will arrive soon' },
          { letter: 'C', text: 'Experts disagree about if and when it will happen' },
          { letter: 'D', text: 'It is not a topic of serious research' }
        ],
        correctAnswer: 'C',
        explanation: 'The passage states AGI "remains a subject of intense speculation. Some researchers believe it is decades away, while others argue it may never be achieved," showing disagreement among experts.'
      },
      {
        id: 5,
        questionText: 'Which of the following is mentioned as a potential benefit of AI in healthcare?',
        questionType: 'detail',
        options: [
          { letter: 'A', text: 'Replacing all doctors' },
          { letter: 'B', text: 'Making healthcare free' },
          { letter: 'C', text: 'Earlier detection of certain cancers' },
          { letter: 'D', text: 'Eliminating all diseases' }
        ],
        correctAnswer: 'C',
        explanation: 'The passage states that "AI systems have demonstrated the ability to detect certain cancers earlier than human doctors."'
      },
      {
        id: 6,
        questionText: 'What concern does the passage raise about the concentration of AI development?',
        questionType: 'detail',
        options: [
          { letter: 'A', text: 'It makes AI development slower' },
          { letter: 'B', text: 'It raises questions about accountability and benefit distribution' },
          { letter: 'C', text: 'It improves AI safety' },
          { letter: 'D', text: 'It reduces costs for consumers' }
        ],
        correctAnswer: 'B',
        explanation: 'The passage states that "the concentration of AI development in a handful of large technology companies raises questions about democratic accountability and the distribution of economic benefits."'
      }
    ],
    createdAt: new Date('2024-02-15')
  }
];

export const getReadingPassageById = (id: string): ReadingPassage | undefined => {
  return sampleReadingPassages.find(p => p.id === id);
};

export const getReadingPassagesByDifficulty = (difficulty: string): ReadingPassage[] => {
  return sampleReadingPassages.filter(p => p.difficulty === difficulty);
};

export const getReadingPassagesByTopic = (topic: string): ReadingPassage[] => {
  return sampleReadingPassages.filter(p => p.topic === topic);
};










