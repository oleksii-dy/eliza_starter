import { describe, expect, it } from "vitest";

import { parseLocation } from "../parsers";

describe.only("Parsers", () => {
    describe("Location", () => {
        it("should parse location", () => {
            const location = parseLocation(
                "<extracted_location>New York</extracted_location>"
            );
            expect(location).toBe("New York");
        });
        it("should return null if invalid extracted location tag", () => {
            const location = parseLocation(
                "<extraced_location>New York</extraced_location>"
            );
            expect(location).toBe(null);
        });
        it("should return null if no extracted location tag", () => {
            const location = parseLocation("New York");
            expect(location).toBe(null);
        });
        it("should return null if no location in tags", () => {
            const location = parseLocation(
                "<extracted_location></extracted_location>"
            );
            expect(location).toBe(null);
        });
    });
});
