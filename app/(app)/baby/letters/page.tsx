import { LettersScreen } from "@/app/(app)/baby/letters/LettersScreen";
import { createLetter, updateLetter } from "@/app/actions/letters";
import { getLettersData } from "@/lib/supabase/queries/letters";

export default async function LettersPage() {
  const letters = await getLettersData();

  // The cross-cutting signal does not exist yet. The screen still owns and
  // tests complete write suppression so this can be switched safely later.
  const sensitiveMode = false;

  return (
    <LettersScreen
      initialLetters={letters}
      sensitiveMode={sensitiveMode}
      onCreate={createLetter}
      onUpdate={updateLetter}
    />
  );
}
