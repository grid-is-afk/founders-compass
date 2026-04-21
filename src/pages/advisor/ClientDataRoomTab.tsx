import { useOutletContext } from "react-router-dom";
import { AdvisorDataRoom } from "./AdvisorPlaceholders";

interface ClientRecord {
  id: string;
  name: string;
}

export default function ClientDataRoomTab() {
  const { client } = useOutletContext<{ client: ClientRecord }>();
  return <AdvisorDataRoom clientOverride={{ id: client.id, name: client.name }} />;
}
