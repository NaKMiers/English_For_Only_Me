import { splitSampleAnswer } from '@/modules/ielts/writing/sampleAnswer'

/** A sample answer's centered title (if any) and its paragraphs. */
export function SampleAnswerBody({ text }: { text: string }) {
  const { title, paragraphs } = splitSampleAnswer(text)

  return (
    <>
      {title ? (
        <h3 className="text-center font-sans text-xl leading-tight font-semibold">
          {title}
        </h3>
      ) : null}
      {paragraphs.map((paragraph, index) => (
        <p
          className="whitespace-pre-line"
          key={index}
        >
          {paragraph}
        </p>
      ))}
    </>
  )
}
