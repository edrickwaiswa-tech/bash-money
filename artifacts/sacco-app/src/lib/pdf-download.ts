import jsPDF from "jspdf";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

function browserDownload(doc: jsPDF, filename: string) {
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function savePdf(doc: jsPDF, filename: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    browserDownload(doc, filename);
    return;
  }

  const dataUri = doc.output("datauristring");
  const base64Data = dataUri.slice(dataUri.indexOf(",") + 1);

  await Filesystem.writeFile({
    path: filename,
    data: base64Data,
    directory: Directory.Documents,
    recursive: true,
  });

  const { uri } = await Filesystem.getUri({
    path: filename,
    directory: Directory.Documents,
  });

  await Share.share({
    title: filename,
    text: "PDF exported from Bash MM",
    url: uri,
    dialogTitle: "Save or share PDF",
  });
}
