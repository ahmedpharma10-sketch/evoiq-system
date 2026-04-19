import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { localStorageService } from "@/lib/localStorage";
import { createDefaultEmployeeFormTemplate } from "@/lib/employee/defaultTemplate";
import type { EmployeeFormTemplate, FormField } from "@shared/schema";
import { FileText, Info, CheckCircle2 } from "lucide-react";

export default function EmployeeFormBuilder() {
  const { data: template, refetch } = useQuery<EmployeeFormTemplate | null>({
    queryKey: ["employee-form-template"],
    queryFn: () => {
      const templates = localStorageService.getEmployeeFormTemplates();
      let activeTemplate = templates.find(t => t.isActive) || null;
      const latestTemplate = createDefaultEmployeeFormTemplate();
      
      // Initialize with default template if none exists OR if version is outdated
      if (!activeTemplate || activeTemplate.version < latestTemplate.version) {
        // Delete old template if exists
        if (activeTemplate) {
          localStorageService.deleteEmployeeFormTemplate(activeTemplate.id);
        }
        // Add new template
        activeTemplate = latestTemplate;
        localStorageService.addEmployeeFormTemplate(activeTemplate);
      }
      
      return activeTemplate;
    },
  });

  // No longer needed - version check handled in queryFn
  useEffect(() => {
    // Force refetch on mount to ensure latest version
    refetch();
  }, [refetch]);

  if (!template) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Employee Form Template</CardTitle>
          <CardDescription>Loading form template...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const renderField = (field: FormField) => {
    const isHeader = field.type === "section_header";
    const isInfo = field.type === "info_text";
    const hasConditions = field.conditionalRules && field.conditionalRules.length > 0;

    if (isHeader) {
      return (
        <div key={field.id} className="col-span-2 mt-6 first:mt-0">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            {field.label}
          </h3>
          <Separator className="mt-2" />
        </div>
      );
    }

    if (isInfo) {
      return (
        <div key={field.id} className="col-span-2 flex items-start gap-2 rounded-md bg-muted p-3">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-sm text-muted-foreground">{field.label}</p>
        </div>
      );
    }

    return (
      <div
        key={field.id}
        className={`rounded-lg border bg-card p-4 ${field.width === "half" ? "" : "col-span-2"}`}
        data-testid={`form-field-${field.name}`}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground">
                {field.label}
              </label>
              {field.required && (
                <Badge variant="destructive" className="text-xs h-5">Required</Badge>
              )}
              {hasConditions && (
                <Badge variant="outline" className="text-xs h-5">Conditional</Badge>
              )}
            </div>
            {field.helperText && (
              <p className="text-xs text-muted-foreground mt-1">{field.helperText}</p>
            )}
          </div>
          <Badge variant="secondary" className="text-xs">
            {field.type}
          </Badge>
        </div>

        {field.placeholder && (
          <p className="text-xs text-muted-foreground italic">
            Placeholder: "{field.placeholder}"
          </p>
        )}

        {field.options && field.options.length > 0 && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-1">Options:</p>
            <div className="flex flex-wrap gap-1">
              {field.options.map((opt, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {opt.label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {field.autoCalculate && (
          <div className="mt-2 pt-2 border-t flex items-center gap-2">
            <CheckCircle2 className="h-3 w-3 text-green-600" />
            <p className="text-xs text-green-600">
              Auto-calculated: {field.autoCalculate.formula}
            </p>
          </div>
        )}

        {hasConditions && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Conditional Rules: {field.conditionalRules?.length}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary">
                <FileText className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle>{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={template.isActive ? "default" : "secondary"}>
                {template.isActive ? "Active" : "Inactive"}
              </Badge>
              <Badge variant="outline">v{template.version}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Total Steps:</span> {template.steps.length}
            </p>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Total Fields:</span> {template.fields.length}
            </p>
          </div>
        </CardContent>
      </Card>

      {template.steps
        .sort((a, b) => a.order - b.order)
        .map((step) => {
          const stepFields = template.fields
            .filter((f) => f.step === step.order)
            .sort((a, b) => (a.order || 0) - (b.order || 0));

          return (
            <Card key={step.id}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge className="h-6 w-6 rounded-full p-0 flex items-center justify-center">
                    {step.order}
                  </Badge>
                  <div>
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                    {step.description && (
                      <CardDescription>{step.description}</CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {stepFields.map(renderField)}
                </div>
              </CardContent>
            </Card>
          );
        })}

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">About This Form</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            This form template defines all fields and conditional logic for employee onboarding.
            You can view the complete structure including all immigration status pathways and automatic calculations.
          </p>
          <p className="text-xs">
            Form editing capabilities will be available in a future update. Currently, this template
            is used by the "Add Employee" wizard to collect employee information.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
