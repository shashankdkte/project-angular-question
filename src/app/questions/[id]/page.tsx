import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { renderAnswerSection } from "@/components/answer-sections/registry";
import { FinalTakeaway, LearningOutcomes, SourceNotes } from "@/components/answer-sections/sections-technical";
import { QuestionHeader } from "@/components/questions/question-header";
import { QuestionReader, type ReaderSection } from "@/components/questions/question-reader";
import { sectionShortTitle, sectionTitle } from "@/lib/curriculum";
import { contentRepository } from "@/lib/content/repository";
import { countWords } from "@/lib/content/text";

type Params = Promise<{ id: string }>;

/** One statically generated page per loaded question; ids come from the build-generated index. */
export async function generateStaticParams() {
  try {
    const { questions } = await contentRepository.getIndex();
    return questions.map((question) => ({ id: question.id }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const question = await contentRepository.getQuestion(id);
  if (!question) return { title: "Question not found" };
  return { title: `${question.id} · ${question.topic}`, description: question.answer.definition.text };
}

export default async function QuestionPage({ params }: { params: Params }) {
  const { id } = await params;
  const [question, neighbors] = await Promise.all([contentRepository.getQuestion(id), contentRepository.getNeighbors(id)]);
  if (!question || !neighbors) notFound();

  // Sections follow the order declared by the source batch; each is rendered by the section registry.
  const sections: ReaderSection[] = question.answerSectionOrder.map((key) => ({
    key,
    title: sectionTitle(key),
    shortTitle: sectionShortTitle(key),
    seconds: question.sectionSeconds[key] ?? 0,
    content: renderAnswerSection(key, question.answer),
  }));

  const closingWords = [question.answer.finalTakeaway, ...question.learningOutcomes].reduce((sum, text) => sum + countWords(text), 0);

  return (
    <QuestionReader
      questionId={question.id}
      sections={sections}
      header={<QuestionHeader question={question} />}
      closing={
        <>
          <FinalTakeaway text={question.answer.finalTakeaway} />
          <LearningOutcomes items={question.learningOutcomes} />
          <SourceNotes notes={question.sourceNotes} />
        </>
      }
      closingSeconds={Math.round((closingWords / 220) * 60)}
      neighbors={{
        previous: neighbors.previous && { id: neighbors.previous.id, title: neighbors.previous.topic },
        next: neighbors.next && { id: neighbors.next.id, title: neighbors.next.topic },
        position: neighbors.position,
        total: neighbors.total,
      }}
    />
  );
}
