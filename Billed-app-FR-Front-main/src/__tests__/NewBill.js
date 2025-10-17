/**
 * @jest-environment jsdom
 */

import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { localStorageMock } from "../__mocks__/localStorage.js";
import NewBill from "../containers/NewBill.js";
import NewBillUI from "../views/NewBillUI.js";

// Mock the store
const mockStore = {
  bills() {
    return {
      create: jest.fn().mockResolvedValue({
        fileUrl: "https://test.com/file.jpg",
        key: "123",
      }),
      update: jest.fn().mockResolvedValue({}),
    };
  },
};

// Mock navigation function
const mockOnNavigate = jest.fn();

describe("Given I am connected as an employee", () => {
  beforeEach(() => {
    // Setup localStorage mock
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
    });
    window.localStorage.setItem(
      "user",
      JSON.stringify({
        type: "Employee",
      })
    );

    // Reset mocks
    mockOnNavigate.mockClear();
    mockStore.bills().create.mockClear();
    mockStore.bills().update.mockClear();
  });

  describe("When I am on NewBill Page", () => {
    test("Then the form should be displayed with all required fields", () => {
      const html = NewBillUI();
      document.body.innerHTML = html;

      // Check if all form elements are present
      expect(screen.getByTestId("form-new-bill")).toBeTruthy();
      expect(screen.getByTestId("expense-type")).toBeTruthy();
      expect(screen.getByTestId("expense-name")).toBeTruthy();
      expect(screen.getByTestId("datepicker")).toBeTruthy();
      expect(screen.getByTestId("amount")).toBeTruthy();
      expect(screen.getByTestId("vat")).toBeTruthy();
      expect(screen.getByTestId("pct")).toBeTruthy();
      expect(screen.getByTestId("commentary")).toBeTruthy();
      expect(screen.getByTestId("file")).toBeTruthy();
    });

    test("Then the expense type dropdown should have all options", () => {
      const html = NewBillUI();
      document.body.innerHTML = html;

      const expenseTypeSelect = screen.getByTestId("expense-type");
      const options = Array.from(expenseTypeSelect.options).map(
        (option) => option.text
      );

      expect(options).toContain("Transports");
      expect(options).toContain("Restaurants et bars");
      expect(options).toContain("Hôtel et logement");
      expect(options).toContain("Services en ligne");
      expect(options).toContain("IT et électronique");
      expect(options).toContain("Equipement et matériel");
      expect(options).toContain("Fournitures de bureau");
    });

    test("Then I should be able to select a valid image file", async () => {
      const html = NewBillUI();
      document.body.innerHTML = html;

      // Initialize the NewBill container
      new NewBill({
        document,
        onNavigate: mockOnNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      const fileInput = screen.getByTestId("file");
      const file = new File(["test"], "test.jpg", { type: "image/jpeg" });

      // Mock the file input change
      Object.defineProperty(fileInput, "files", {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      // Wait for the file upload to complete
      await waitFor(() => {
        expect(mockStore.bills().create).toHaveBeenCalled();
      });
    });

    test("Then I should not be able to select an invalid file type", () => {
      const html = NewBillUI();
      document.body.innerHTML = html;

      // Mock alert function
      window.alert = jest.fn();

      // Initialize the NewBill container
      new NewBill({
        document,
        onNavigate: mockOnNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      const fileInput = screen.getByTestId("file");
      const file = new File(["test"], "test.pdf", { type: "application/pdf" });

      // Mock the file input change
      Object.defineProperty(fileInput, "files", {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      // Check that alert was called and file input was cleared
      expect(window.alert).toHaveBeenCalledWith(
        "Please select a valid image file (JPG, JPEG, or PNG)"
      );
      expect(fileInput.value).toBe("");
    });

    test("Then I should be able to submit the form with valid data", async () => {
      const html = NewBillUI();
      document.body.innerHTML = html;

      // Initialize the NewBill container
      const newBill = new NewBill({
        document,
        onNavigate: mockOnNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      // Fill in the form
      fireEvent.change(screen.getByTestId("expense-type"), {
        target: { value: "Transports" },
      });
      fireEvent.change(screen.getByTestId("expense-name"), {
        target: { value: "Taxi ride" },
      });
      fireEvent.change(screen.getByTestId("datepicker"), {
        target: { value: "2024-01-15" },
      });
      fireEvent.change(screen.getByTestId("amount"), {
        target: { value: "50" },
      });
      fireEvent.change(screen.getByTestId("vat"), { target: { value: "10" } });
      fireEvent.change(screen.getByTestId("pct"), { target: { value: "20" } });
      fireEvent.change(screen.getByTestId("commentary"), {
        target: { value: "Business trip" },
      });

      // Add a valid file first
      const fileInput = screen.getByTestId("file");
      const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
      Object.defineProperty(fileInput, "files", {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      // Wait for file upload to complete
      await waitFor(() => {
        expect(mockStore.bills().create).toHaveBeenCalled();
      });

      // Submit the form
      fireEvent.submit(screen.getByTestId("form-new-bill"));

      // Check that update was called and navigation occurred
      await waitFor(() => {
        expect(mockStore.bills().update).toHaveBeenCalled();
        expect(mockOnNavigate).toHaveBeenCalled();
      });
    });

    test("Then the form should use default percentage of 20 if not provided", async () => {
      const html = NewBillUI();
      document.body.innerHTML = html;

      // Initialize the NewBill container
      new NewBill({
        document,
        onNavigate: mockOnNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      // Fill in the form without percentage
      fireEvent.change(screen.getByTestId("expense-type"), {
        target: { value: "Transports" },
      });
      fireEvent.change(screen.getByTestId("expense-name"), {
        target: { value: "Taxi ride" },
      });
      fireEvent.change(screen.getByTestId("datepicker"), {
        target: { value: "2024-01-15" },
      });
      fireEvent.change(screen.getByTestId("amount"), {
        target: { value: "50" },
      });
      fireEvent.change(screen.getByTestId("vat"), { target: { value: "10" } });
      // Leave pct empty
      fireEvent.change(screen.getByTestId("commentary"), {
        target: { value: "Business trip" },
      });

      // Add a valid file
      const fileInput = screen.getByTestId("file");
      const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
      Object.defineProperty(fileInput, "files", {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(mockStore.bills().create).toHaveBeenCalled();
      });

      // Submit the form
      fireEvent.submit(screen.getByTestId("form-new-bill"));

      // Check that the bill was created with default percentage
      await waitFor(() => {
        expect(mockStore.bills().update).toHaveBeenCalledWith({
          data: expect.stringContaining('"pct":20'),
          selector: "123",
        });
      });
    });
  });
});
