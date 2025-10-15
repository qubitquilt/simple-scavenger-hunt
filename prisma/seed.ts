import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Delete specific event if exists to avoid slug conflict
  await prisma.event.deleteMany({
    where: { slug: 'seattle-mopop' }
  });

  // Clean up related data
  await prisma.answer.deleteMany({});
  await prisma.progress.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.user.deleteMany({});

  const mopopEvent = await prisma.event.create({
    data: {
      title: 'Seattle MoPOP Scavenger Hunt',
      slug: 'seattle-mopop',
      description: 'A scavenger hunt at the Museum of Pop Culture in Seattle.',
      date: new Date('2025-10-26T10:00:00Z'),
      questions: {
        create: [
           {
             title: 'Introduce yourself',
             slug: 'sky-church-introduce',
             content: '01. Introduce yourself to someone you don\'t know. Who did you meet?',
             type: 'text',
             category: 'Sky Church',
             expectedAnswer: "Anything (their name, description, etc.)",
             hintEnabled: false,
             aiThreshold: 0,
           },
           {
             title: 'Picture with same color wristband',
             slug: 'sky-church-same-wristband',
             content: '02. Take a picture with 3 other people wearing the same color wristband.',
             type: 'multiple_choice',
             category: 'Sky Church',
             options: { "A": "Yes I took the picture", "B": "No I didn't" },
             expectedAnswer: "A",
             hintEnabled: false,
             aiThreshold: 0,
           },
           {
             title: 'Selfie with different color wristband',
             slug: 'sky-church-different-wristband',
             content: '03. Take a selfie with someone wearing a different color wristband',
             type: 'multiple_choice',
             category: 'Sky Church',
             options: { "A": "Yes I took the picture", "B": "No I didn't" },
             expectedAnswer: "A",
             hintEnabled: false,
             aiThreshold: 0,
           },
           {
             title: 'Selfie with red guitar',
             slug: 'sky-church-red-guitar',
             content: '04. Take a selfie with someone and a red guitar',
             type: 'multiple_choice',
             category: 'Sky Church',
             options: { "A": "Yes I took the picture", "B": "No I didn't" },
             expectedAnswer: "A",
             hintEnabled: false,
             aiThreshold: 0,
           },
           {
             title: 'Selfie with yellow guitar',
             slug: 'sky-church-yellow-guitar',
             content: '05. Take a selfie with someone and a yellow guitar',
             type: 'multiple_choice',
             category: 'Sky Church',
             options: { "A": "Yes I took the picture", "B": "No I didn't" },
             expectedAnswer: "A",
             hintEnabled: false,
             aiThreshold: 0,
           },
           {
             title: 'Selfie with blue guitar',
             slug: 'sky-church-blue-guitar',
             content: '06. Take a selfie with someone and a blue guitar',
             type: 'multiple_choice',
             category: 'Sky Church',
             options: { "A": "Yes I took the picture", "B": "No I didn't" },
             expectedAnswer: "A",
             hintEnabled: false,
             aiThreshold: 0,
           },
           {
             title: 'Jimi\'s Studio',
             slug: 'hendrix-studio',
             content: '08. What was the name of Jimi\'s Studio?',
             type: 'text',
             category: 'Wild Blue Angel: Hendrix Abroad 1966-1970',
             expectedAnswer: 'Electric Lady Studio',
             hintEnabled: true,
             aiThreshold: 7,
           },
           {
             title: 'Wearing Jimi\'s Westerner Hat',
             slug: 'hendrix-hat',
             content: '09. Take a picture so it looks like you\'re wearing Jimi\'s Westerner Hat.',
             type: 'multiple_choice',
             category: 'Wild Blue Angel: Hendrix Abroad 1966-1970',
             options: { "A": "Yes I took the picture", "B": "No I didn't" },
             expectedAnswer: "A",
             hintEnabled: true,
             aiThreshold: 0,
           },
           {
             title: 'Women video game creators',
             slug: 'indie-women-creators',
             content: '10. What percent of women are video game creators?',
             type: 'text',
             category: 'Indie Game Revolution',
             expectedAnswer: '30%',
             hintEnabled: true,
             aiThreshold: 5,
           },
           {
             title: 'Oldest instrument',
             slug: 'guitar-oldest',
             content: '11. What is the oldest instrument in this exhibition?',
             type: 'text',
             category: 'Guitar Gallery',
             expectedAnswer: '1900 Wolfram Triumph',
             hintEnabled: true,
             aiThreshold: 5,
           },
           {
             title: 'Lizzo\'s catsuit designer',
             slug: 'pop-lizzo-designer',
             content: '12. Who designed Lizzo\'s catsuit?',
             type: 'text',
             category: 'Massive: The Power of Pop Culture',
             expectedAnswer: 'Seth Pratts',
             hintEnabled: true,
             aiThreshold: 5,
           },
           {
             title: 'Rebel soldier uniform planet',
             slug: 'sci-fi-rebel-planet',
             content: '13. The Rebel soldier uniform is from the battle on what planet?',
             type: 'text',
             category: 'Infinite Worlds of Science Fiction',
             expectedAnswer: 'Hoth',
             hintEnabled: true,
             aiThreshold: 6,
           },
           {
             title: 'Harry Potter scarf house',
             slug: 'fantasy-hp-scarf',
             content: '14. What house is the scarf in the Harry Potter display from?',
             type: 'text',
             category: 'Fantasy: Worlds of Myth and Magic',
             expectedAnswer: 'Gryffindor',
             hintEnabled: true,
             aiThreshold: 5,
           },
           {
             title: 'Axe movie',
             slug: 'horror-axe-movie',
             content: '15. What movie is the axe from?',
             type: 'text',
             category: 'Scared to Death: The Thrill of Horror Film',
             expectedAnswer: 'The Shining',
             hintEnabled: true,
             aiThreshold: 5,
           },
           {
             title: 'Samantha\'s strange object',
             slug: 'last-pug-duck',
             content: '16. What strange object did Samantha create to make her scavenger hunt desk fit in at the MoPOP?',
             type: 'text',
             category: 'Last Question',
             expectedAnswer: 'Pug Duck',
             hintEnabled: true,
             aiThreshold: 5,
           },
         ]
       }
     }
   });
   console.log(`Created event: ${mopopEvent.title}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
