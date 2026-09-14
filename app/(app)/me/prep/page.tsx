import { redirect } from "next/navigation";
import { PrepChecklist } from "@/app/(app)/me/prep/PrepChecklist";
import {
  addEmergencyContact,
  deleteEmergencyContact,
  loadPrepData,
  saveBirthNotes,
  toggleChecklistItem,
  updateEmergencyContact,
} from "@/app/actions/checklist";

export default async function PrepPage() {
  const result = await loadPrepData();
  if (!result.ok) redirect("/signin");

  const { items, progress, contacts, birthNotes, pregnancyId } = result.data;

  return (
    <PrepChecklist
      items={items}
      progress={progress}
      contacts={contacts}
      birthNotes={birthNotes}
      pregnancyId={pregnancyId}
      onToggleItem={toggleChecklistItem}
      onAddContact={addEmergencyContact}
      onUpdateContact={updateEmergencyContact}
      onDeleteContact={deleteEmergencyContact}
      onSaveBirthNotes={saveBirthNotes}
    />
  );
}
