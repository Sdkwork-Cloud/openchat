import { createServiceResultProxy } from "@sdkwork/openchat-pc-contracts";
import contactService from "./contact.service";

export const ContactResultService = createServiceResultProxy(contactService, {
  source: "http-or-mock",
  fallbackMessage: "Contacts service request failed.",
});
