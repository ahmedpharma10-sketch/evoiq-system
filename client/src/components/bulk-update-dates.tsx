import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Company } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Save } from "lucide-react";

export default function BulkUpdateDates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dates, setDates] = useState<Record<string, string>>({});

  const { data: companies } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
    queryFn: async () => await api.getCompanies(),
  });

  const companiesWithoutDates = companies?.filter(c => !c.incorporationDate) || [];

  const updateMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(dates)
        .filter(([_, date]) => date && date.trim() !== "")
        .map(([companyId, incorporationDate]) => 
          api.updateCompany(companyId, { incorporationDate })
        );
      
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      queryClient.invalidateQueries({ queryKey: ["calculated-tasks"] });
      toast({
        title: "Incorporation dates updated",
        description: `${Object.keys(dates).filter(k => dates[k]).length} companies updated successfully.`,
      });
      setDates({});
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating dates",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDateChange = (companyId: string, date: string) => {
    setDates(prev => ({ ...prev, [companyId]: date }));
  };

  const handleSubmit = () => {
    const validDates = Object.values(dates).filter(d => d && d.trim() !== "");
    if (validDates.length === 0) {
      toast({
        title: "No dates entered",
        description: "Please enter at least one incorporation date.",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate();
  };

  if (companiesWithoutDates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Bulk Update Incorporation Dates
          </CardTitle>
          <CardDescription>
            All companies have incorporation dates set!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Bulk Update Incorporation Dates
        </CardTitle>
        <CardDescription>
          Add incorporation dates for {companiesWithoutDates.length} companies missing dates. Tasks will be automatically generated once dates are added.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {companiesWithoutDates.map((company) => (
            <div key={company.id} className="flex items-center gap-4">
              <div className="flex-1">
                <div className="font-medium">{company.name}</div>
                <div className="text-sm text-muted-foreground">Company #{company.number}</div>
              </div>
              <Input
                type="date"
                value={dates[company.id] || ""}
                onChange={(e) => handleDateChange(company.id, e.target.value)}
                className="w-48"
                data-testid={`input-bulk-date-${company.id}`}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setDates({})}
            disabled={updateMutation.isPending || Object.keys(dates).length === 0}
            data-testid="button-clear-dates"
          >
            Clear All
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={updateMutation.isPending || Object.keys(dates).filter(k => dates[k]).length === 0}
            data-testid="button-save-dates"
          >
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? "Saving..." : `Save ${Object.keys(dates).filter(k => dates[k]).length} Dates`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
