import { MyRecordClient } from "../../components/my-record-client";

export const metadata = {
  title: "My Record | The Local Record",
  description:
    "Private saved places, resident watchlists, and source-linked local record alerts."
};

export default function MyRecordPage() {
  return <MyRecordClient />;
}
