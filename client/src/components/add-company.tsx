import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCompanySchema, type InsertCompany } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { localStorageService } from "@/lib/localStorage";
import { authService } from "@/lib/authService";
import { idGenerator } from "@/lib/idGenerator";
import { parseCompaniesCSV, type ParsedCSVRow } from "@/lib/csv-parser";
import { Building2, Calendar, User, FileText, Phone, Mail, Download, Plus, Trash2, MessageCircle, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState, useRef } from "react";
import { getWhatsAppLink, checkWhatsAppAvailable } from "@/lib/whatsapp";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";

interface AddCompanyProps {
  onSuccess?: () => void;
}

export default function AddCompany({ onSuccess }: AddCompanyProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFetching, setIsFetching] = useState(false);
  const [emails, setEmails] = useState<string[]>([""]);
  const [phones, setPhones] = useState<string[]>([""]);
  const [comprehensiveData, setComprehensiveData] = useState<Partial<InsertCompany>>({});

  // CSV Import state
  const [parsedCSVData, setParsedCSVData] = useState<ParsedCSVRow[]>([]);
  const [showCSVPreview, setShowCSVPreview] = useState(false);
  const [showConfirmImport, setShowConfirmImport] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const form = useForm<InsertCompany>({
    resolver: zodResolver(insertCompanySchema),
    defaultValues: {
      name: "",
      number: "",
      address: "",
      incorporationDate: "",
      industryCode: "",
      director: "",
      psc: "",
      internalCode: "",
      utr: "",
      governmentGateway: "",
      ownerName: "",
      ownerEmail: "",
      ownerPhone: "",
      ownerEmails: [],
      ownerPhones: [],
      googleDriveLink: "",
      hasRenewalFees: false,
      renewalFees: "",
      // Companies House auto-filled fields
      companyStatus: "",
      companyType: "",
      jurisdiction: "",
      hasCharges: undefined,
      hasInsolvency: undefined,
      confirmationStatementDue: "",
      accountsDue: "",
      lastAccountsDate: "",
      confirmationStatementLastMade: "",
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (companies: Partial<InsertCompany>[]) => {
      const response = await fetch("/api/companies/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companies }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to import companies");
      }
      return response.json();
    },
    onSuccess: async (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      queryClient.invalidateQueries({ queryKey: ["systemActivityLogs"] });
      queryClient.invalidateQueries({ queryKey: ["companyActivityLogs"] });

      toast({
        title: "Bulk import completed",
        description: `Successfully imported ${result.successCount} companies. ${result.failureCount ? `${result.failureCount} rows failed.` : ""}`,
      });

      // Reset CSV state
      setParsedCSVData([]);
      setShowCSVPreview(false);
      setShowConfirmImport(false);
      setSelectedRows(new Set());
      setImportProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";

      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createCompanyMutation = useMutation({
    mutationFn: async (data: InsertCompany) => {
      return await api.createCompany(data);
    },
    onSuccess: async (newCompany) => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });

      // Add activity log for company creation (both tables)
      const currentUser = authService.getCurrentUser();
      const logAction = "activated";
      const logReason = `Company "${newCompany.name}" (${newCompany.number}) created and added to the system`;

      // Add to CompanyActivityLog table (for company detail page)
      localStorageService.addCompanyActivityLog({
        id: idGenerator.generateLogID(),
        companyId: newCompany.id,
        companyName: newCompany.name,
        timestamp: new Date().toISOString(),
        action: logAction,
        reason: logReason,
        performedBy: currentUser?.name || "System",
        meta: {},
      });

      // Add to company's activityLog array (for System Activity Log in admin)
      localStorageService.addCompanyActivityLogEntry(
        newCompany.id,
        "Company Created",
        logReason,
        currentUser?.name || "System"
      );

      queryClient.invalidateQueries({ queryKey: ["systemActivityLogs"] });
      queryClient.invalidateQueries({ queryKey: ["companyActivityLogs"] });
      
      // Auto-generate tasks for new company
      try {
        await api.generateTasks();
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        queryClient.invalidateQueries({ queryKey: ["last-task-generation"] });
      } catch (error) {
        console.error("Failed to auto-generate tasks:", error);
      }
      
      toast({
        title: "Company added successfully",
        description: "The company has been added to the system.",
      });
      form.reset();
      setEmails([""]);
      setPhones([""]);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error adding company",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const fetchFromCH = async () => {
    const companyNumber = form.getValues("number");
    
    if (!companyNumber) {
      toast({
        title: "Company number required",
        description: "Please enter a company number first",
        variant: "destructive",
      });
      return;
    }

    setIsFetching(true);
    try {
      const result = await api.fetchCompanyDataByNumber(companyNumber);
      
      if (result.success && result.data) {
        // Store ALL comprehensive data including arrays
        setComprehensiveData(result.data);
        
        // Update form fields with fetched data (including padded company number)
        if (result.data.number) form.setValue("number", result.data.number);
        if (result.data.name) form.setValue("name", result.data.name);
        if (result.data.incorporationDate) form.setValue("incorporationDate", result.data.incorporationDate);
        if (result.data.address) form.setValue("address", result.data.address);
        if (result.data.industryCode) form.setValue("industryCode", result.data.industryCode);
        if (result.data.director) form.setValue("director", result.data.director);
        if (result.data.psc) form.setValue("psc", result.data.psc);
        if (result.data.companiesHouseLink) form.setValue("companiesHouseLink", result.data.companiesHouseLink);
        
        // Additional Companies House fields
        if (result.data.companyStatus) form.setValue("companyStatus", result.data.companyStatus);
        if (result.data.companyType) form.setValue("companyType", result.data.companyType);
        if (result.data.jurisdiction) form.setValue("jurisdiction", result.data.jurisdiction);
        if (result.data.hasCharges !== undefined) form.setValue("hasCharges", result.data.hasCharges);
        if (result.data.hasInsolvency !== undefined) form.setValue("hasInsolvency", result.data.hasInsolvency);
        if (result.data.confirmationStatementDue) form.setValue("confirmationStatementDue", result.data.confirmationStatementDue);
        if (result.data.accountsDue) form.setValue("accountsDue", result.data.accountsDue);
        if (result.data.lastAccountsDate) form.setValue("lastAccountsDate", result.data.lastAccountsDate);
        if (result.data.confirmationStatementLastMade) form.setValue("confirmationStatementLastMade", result.data.confirmationStatementLastMade);
        
        let fetchedFields = ["name", "incorporation date", "address", "industry code"];
        if (result.data.director) fetchedFields.push("director");
        if (result.data.psc) fetchedFields.push("PSC");
        if (result.data.companyStatus) fetchedFields.push("status");
        if (result.data.companyType) fetchedFields.push("type");
        if (result.data.directors?.length) fetchedFields.push(`${result.data.directors.length} directors`);
        if (result.data.filings?.length) fetchedFields.push(`${result.data.filings.length} filings`);
        
        toast({
          title: "Data fetched successfully",
          description: `Populated ${fetchedFields.length} fields from Companies House including comprehensive governance and filing data`,
        });
      }
    } catch (error: any) {
      // Update company number field with padded version even on error
      if (error?.paddedNumber) {
        form.setValue("number", error.paddedNumber);
      }
      
      toast({
        title: "Error fetching data",
        description: error instanceof Error ? error.message : "Failed to fetch from Companies House",
        variant: "destructive",
      });
    } finally {
      setIsFetching(false);
    }
  };

  const onSubmit = (data: InsertCompany) => {
    // Merge form data with comprehensive array fields and multi-contact fields
    // Strategy: Keep all user-editable form fields, but override ONLY the array fields
    // This allows users to edit name/address after fetching, while preserving comprehensive data
    const filteredEmails = emails.filter(e => e.trim() !== "");
    const filteredPhones = phones.filter(p => p.trim() !== "");
    
    const submissionData: InsertCompany = {
      ...data, // All form fields (user-editable)
      // Override ONLY the array fields with comprehensive data
      directors: comprehensiveData.directors || [],
      officers: comprehensiveData.officers || [],
      pscs: comprehensiveData.pscs || [],
      filings: comprehensiveData.filings || [],
      charges: comprehensiveData.charges || [],
      insolvencyHistory: comprehensiveData.insolvencyHistory || [],
      // Add multi-contact fields (arrays)
      ownerEmails: filteredEmails,
      ownerPhones: filteredPhones,
      // Set single contact fields from first array element (required for completion calculation)
      ownerEmail: filteredEmails[0] || "",
      ownerPhone: filteredPhones[0] || "",
    };
    createCompanyMutation.mutate(submissionData);
  };

  const addEmail = () => {
    setEmails([...emails, ""]);
  };

  const removeEmail = (index: number) => {
    setEmails(emails.filter((_, i) => i !== index));
  };

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const addPhone = () => {
    setPhones([...phones, ""]);
  };

  const removePhone = (index: number) => {
    setPhones(phones.filter((_, i) => i !== index));
  };

  const updatePhone = (index: number, value: string) => {
    const newPhones = [...phones];
    newPhones[index] = value;
    setPhones(newPhones);
  };

  const handleCSVFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseCompaniesCSV(text);

      if (parsed.length === 0) {
        toast({
          title: "No data found",
          description: "The CSV file contains no valid company records",
          variant: "destructive",
        });
        return;
      }

      setParsedCSVData(parsed);
      // Select all valid rows by default
      const validRowIndices = new Set(
        parsed.filter(row => row.isValid).map(row => row.rowIndex)
      );
      setSelectedRows(validRowIndices);
      setShowCSVPreview(true);
      setImportProgress(0);
    } catch (error) {
      toast({
        title: "Error reading file",
        description: error instanceof Error ? error.message : "Failed to read CSV file",
        variant: "destructive",
      });
    }
  };

  const handleConfirmImport = () => {
    const rowsToImport = parsedCSVData.filter(
      row => row.isValid && selectedRows.has(row.rowIndex)
    );

    if (rowsToImport.length === 0) {
      toast({
        title: "No valid rows selected",
        description: "Please select at least one valid row to import",
        variant: "destructive",
      });
      return;
    }

    setShowConfirmImport(true);
  };

  const executeImport = async () => {
    const rowsToImport = parsedCSVData.filter(
      row => row.isValid && selectedRows.has(row.rowIndex)
    );

    setShowConfirmImport(false);
    setShowCSVPreview(false);

    bulkImportMutation.mutate(rowsToImport.map(row => row.data));
  };

  const toggleRowSelection = (rowIndex: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowIndex)) {
      newSelected.delete(rowIndex);
    } else {
      newSelected.add(rowIndex);
    }
    setSelectedRows(newSelected);
  };

  const toggleAllValidRows = () => {
    const validRows = parsedCSVData.filter(row => row.isValid);
    if (selectedRows.size === validRows.length) {
      // Deselect all
      setSelectedRows(new Set());
    } else {
      // Select all valid rows
      setSelectedRows(new Set(validRows.map(row => row.rowIndex)));
    }
  };

  return (
    <>
    <Card className="mx-auto max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Building2 className="h-6 w-6 text-primary" />
          Add New Company
        </CardTitle>
        <CardDescription>
          Enter comprehensive company details including registration, governance, and contact information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-lg font-medium text-foreground">
                  <Building2 className="h-5 w-5" />
                  Company Details
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter company name" 
                            {...field} 
                            data-testid="input-company-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Number *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., 12345678" 
                            {...field} 
                            data-testid="input-company-number"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-start">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={fetchFromCH}
                    disabled={isFetching}
                    className="gap-2"
                    data-testid="button-fetch-ch"
                  >
                    {isFetching ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                        Fetching...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Fetch from Companies House
                      </>
                    )}
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="incorporationDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Incorporation Date *
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            data-testid="input-incorporation-date"
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Required for company registration records
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="industryCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry Code</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., SIC Code" 
                            {...field} 
                            data-testid="input-industry-code"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registered Address *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter full registered address" 
                          className="min-h-[80px]" 
                          {...field} 
                          data-testid="input-address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="h-px bg-border" />

              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-lg font-medium text-foreground">
                  <User className="h-5 w-5" />
                  Directors & PSC
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="director"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Director Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter director name" 
                            {...field} 
                            data-testid="input-director"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="psc"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Person with Significant Control (PSC)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter PSC name" 
                            {...field} 
                            data-testid="input-psc"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="h-px bg-border" />

              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-lg font-medium text-foreground">
                  <FileText className="h-5 w-5" />
                  Government & Internal Codes
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="internalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Internal Code</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Internal reference code" 
                            {...field} 
                            data-testid="input-internal-code"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="utr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unique Taxpayer Reference (UTR)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="10-digit UTR" 
                            {...field} 
                            data-testid="input-utr"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="governmentGateway"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Government Gateway ID</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Gateway user ID" 
                            {...field} 
                            data-testid="input-government-gateway"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="h-px bg-border" />

              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-lg font-medium text-foreground">
                  <Phone className="h-5 w-5" />
                  Contact Information
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="ownerName"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Owner Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter owner name" 
                            {...field} 
                            data-testid="input-owner-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="md:col-span-2 space-y-2">
                    <FormLabel className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Addresses
                    </FormLabel>
                    {emails.map((email, index) => (
                      <div key={index} className="flex gap-2">
                        <Input 
                          type="email" 
                          placeholder="owner@example.com" 
                          value={email}
                          onChange={(e) => updateEmail(index, e.target.value)}
                          data-testid={`input-email-${index}`}
                        />
                        {emails.length > 1 && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="icon"
                            onClick={() => removeEmail(index)}
                            data-testid={`button-remove-email-${index}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={addEmail}
                      className="gap-2"
                      data-testid="button-add-email"
                    >
                      <Plus className="h-4 w-4" />
                      Add Email
                    </Button>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <FormLabel className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone Numbers
                    </FormLabel>
                    {phones.map((phone, index) => (
                      <div key={index} className="flex gap-2">
                        <Input 
                          type="tel" 
                          placeholder="+44 20 1234 5678" 
                          value={phone}
                          onChange={(e) => updatePhone(index, e.target.value)}
                          data-testid={`input-phone-${index}`}
                        />
                        {phone && checkWhatsAppAvailable(phone) && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="icon"
                            onClick={() => window.open(getWhatsAppLink(phone), '_blank')}
                            title="Send WhatsApp message"
                            data-testid={`button-whatsapp-${index}`}
                          >
                            <MessageCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        {phones.length > 1 && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="icon"
                            onClick={() => removePhone(index)}
                            data-testid={`button-remove-phone-${index}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={addPhone}
                      className="gap-2"
                      data-testid="button-add-phone"
                    >
                      <Plus className="h-4 w-4" />
                      Add Phone
                    </Button>
                  </div>

                  <div className="space-y-4 md:col-span-2">
                    <FormField
                      control={form.control}
                      name="hasRenewalFees"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={(e) => {
                                field.onChange(e.target.checked);
                                if (!e.target.checked) {
                                  form.setValue("renewalFees", "");
                                }
                              }}
                              data-testid="checkbox-has-renewal-fees"
                              className="h-4 w-4 mt-1"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Has Renewal Fees
                            </FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Check if this company has renewal fees
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />
                    {form.watch("hasRenewalFees") && (
                      <FormField
                        control={form.control}
                        name="renewalFees"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Renewal Fees Amount (GBP £) *</FormLabel>
                            <FormControl>
                              <Input 
                                type="text" 
                                placeholder="e.g., 150.00" 
                                {...field} 
                                className={form.watch("hasRenewalFees") && (!field.value || field.value.trim() === '') ? 'border-red-500 border-2' : ''}
                                data-testid="input-renewal-fees"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name="googleDriveLink"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Google Drive Link *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://drive.google.com/..." 
                            {...field} 
                            className={!field.value || field.value.trim() === '' ? 'border-red-500 border-2' : ''}
                            data-testid="input-google-drive-link" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                disabled={createCompanyMutation.isPending}
                data-testid="button-reset"
              >
                Reset Form
              </Button>
              <Button 
                type="submit" 
                disabled={createCompanyMutation.isPending}
                data-testid="button-submit"
              >
                {createCompanyMutation.isPending ? "Adding..." : "Add Company"}
              </Button>
            </div>
          </form>
        </Form>

        {/* CSV Import Section */}
        <div className="mt-12 border-t pt-8">
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-lg font-medium text-foreground">
              <Upload className="h-5 w-5" />
              Bulk Import Companies from CSV
            </h3>
            <p className="text-sm text-muted-foreground">
              Import multiple companies at once from a CSV file exported from this system or compatible format.
            </p>

            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCSVFileUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={bulkImportMutation.isPending}
              >
                <Upload className="mr-2 h-4 w-4" />
                Choose CSV File
              </Button>
              <span className="text-sm text-muted-foreground">
                {fileInputRef.current?.value ? `Selected: ${fileInputRef.current.value.split('\\').pop()}` : 'No file selected'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* CSV Preview Dialog */}
    <Dialog open={showCSVPreview} onOpenChange={setShowCSVPreview}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>CSV Import Preview</DialogTitle>
          <DialogDescription>
            Review parsed data before importing. Invalid rows are disabled.
          </DialogDescription>
        </DialogHeader>

        {parsedCSVData.length > 0 && (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 rounded-lg bg-muted p-4">
              <div>
                <div className="text-2xl font-bold">{parsedCSVData.length}</div>
                <div className="text-sm text-muted-foreground">Total rows</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {parsedCSVData.filter(r => r.isValid).length}
                </div>
                <div className="text-sm text-muted-foreground">Valid</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {parsedCSVData.filter(r => !r.isValid).length}
                </div>
                <div className="text-sm text-muted-foreground">Invalid</div>
              </div>
            </div>

            {/* Select All */}
            <div className="flex items-center gap-2 border-b pb-4">
              <Checkbox
                checked={selectedRows.size === parsedCSVData.filter(r => r.isValid).length && parsedCSVData.some(r => r.isValid)}
                onCheckedChange={() => toggleAllValidRows()}
              />
              <span className="text-sm font-medium">
                Select all valid rows ({parsedCSVData.filter(r => r.isValid).length})
              </span>
            </div>

            {/* Preview Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left w-12"></th>
                    <th className="p-2 text-left">Row</th>
                    <th className="p-2 text-left">Company Name</th>
                    <th className="p-2 text-left">Company Number</th>
                    <th className="p-2 text-left">Incorporation Date</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedCSVData.map((row) => (
                    <tr
                      key={row.rowIndex}
                      className={`border-b ${row.isValid ? '' : 'opacity-50 bg-red-50'}`}
                    >
                      <td className="p-2">
                        <Checkbox
                          checked={selectedRows.has(row.rowIndex) && row.isValid}
                          onCheckedChange={() => toggleRowSelection(row.rowIndex)}
                          disabled={!row.isValid}
                        />
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">{row.rowIndex}</td>
                      <td className="p-2 font-medium">{row.data.name || '-'}</td>
                      <td className="p-2">{row.data.number || '-'}</td>
                      <td className="p-2">{row.data.incorporationDate || '-'}</td>
                      <td className="p-2">
                        {row.isValid ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            Valid
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            Invalid
                          </div>
                        )}
                      </td>
                      <td className="p-2 text-xs">
                        {row.errors.length > 0 && (
                          <details className="cursor-pointer">
                            <summary className="text-red-600 font-medium">
                              {row.errors.length} error{row.errors.length !== 1 ? 's' : ''}
                            </summary>
                            <ul className="mt-2 space-y-1 text-xs">
                              {row.errors.map((err, idx) => (
                                <li key={idx} className="text-red-600">
                                  <strong>{err.field}:</strong> {err.message}
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCSVPreview(false)}
                disabled={bulkImportMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmImport}
                disabled={selectedRows.size === 0 || bulkImportMutation.isPending}
              >
                Import {selectedRows.size} Companies
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Confirmation Dialog */}
    <AlertDialog open={showConfirmImport} onOpenChange={setShowConfirmImport}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Bulk Import</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to import {selectedRows.size} companies. This action will create company records in the system.
            Each company will generate an audit log entry and tasks will be auto-generated.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {bulkImportMutation.isPending && (
          <div className="space-y-2">
            <div className="text-sm font-medium">
              Importing: {Math.round(importProgress)} of {selectedRows.size}
            </div>
            <Progress value={(importProgress / selectedRows.size) * 100} />
          </div>
        )}
        <div className="flex gap-4">
          <AlertDialogCancel disabled={bulkImportMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={executeImport}
            disabled={bulkImportMutation.isPending}
          >
            {bulkImportMutation.isPending ? 'Importing...' : 'Confirm Import'}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
