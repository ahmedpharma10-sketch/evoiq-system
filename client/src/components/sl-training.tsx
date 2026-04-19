import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Download, Upload, Plus, BookOpen, GraduationCap, CheckCircle, XCircle, Trash2, FileText, Loader2 } from "lucide-react";
import type { SlTrainingModule, SlTrainingQuestion, SlTrainingScore } from "@shared/schema";

type ModuleWithQuestions = SlTrainingModule & { questions: SlTrainingQuestion[] };

interface QuizResult {
  questionId: string;
  question: string;
  userAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
  choices: string[];
}

interface QuizResponse {
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  results: QuizResult[];
}

interface SLTrainingProps {
  user: { id: string; name: string; position: string } | null;
}

export default function SLTraining({ user }: SLTrainingProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("training");
  
  const isAdmin = user?.position === "Admin" || user?.position === "Manager" || user?.position === "Director";

  return (
    <Card data-testid="card-sl-training">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          SL Training
        </CardTitle>
        <CardDescription>
          Sponsorship License training modules and quizzes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="training" data-testid="tab-training">
              <BookOpen className="h-4 w-4 mr-2" />
              Training
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="setup" data-testid="tab-setup">
                <FileText className="h-4 w-4 mr-2" />
                Setup
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="training">
            <TrainingTab user={user} />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="setup">
              <SetupTab />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function TrainingTab({ user }: { user: { id: string; name: string } | null }) {
  const { toast } = useToast();
  const [selectedModule, setSelectedModule] = useState<ModuleWithQuestions | null>(null);
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [quizResults, setQuizResults] = useState<QuizResponse | null>(null);

  const { data: modules = [], isLoading: modulesLoading } = useQuery<SlTrainingModule[]>({
    queryKey: ["/api/sl-training/modules"],
  });

  const { data: userScores = [] } = useQuery<SlTrainingScore[]>({
    queryKey: ["/api/sl-training/progress"],
  });

  const fetchModuleMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      const response = await fetch(`/api/sl-training/modules/${moduleId}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch module");
      return response.json() as Promise<ModuleWithQuestions>;
    },
    onSuccess: (data) => {
      setSelectedModule(data);
      setIsQuizMode(false);
      setUserAnswers({});
      setQuizResults(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const submitQuizMutation = useMutation({
    mutationFn: async ({ moduleId, answers }: { moduleId: string; answers: number[] }) => {
      const response = await apiRequest("POST", `/api/sl-training/modules/${moduleId}/quiz`, { answers });
      return response.json() as Promise<QuizResponse>;
    },
    onSuccess: (data) => {
      setQuizResults(data);
      setIsQuizMode(false);
      queryClient.invalidateQueries({ queryKey: ["/api/sl-training/progress"] });
      toast({
        title: `Quiz Complete! Score: ${data.score}%`,
        description: `You got ${data.correctAnswers} out of ${data.totalQuestions} correct.`,
      });
    },
    onError: (error) => {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to submit quiz", variant: "destructive" });
    },
  });

  const getScoreForModule = (moduleId: string) => {
    const score = userScores.find((s) => s.moduleId === moduleId);
    return score;
  };

  const handleStartQuiz = () => {
    setIsQuizMode(true);
    setUserAnswers({});
    setQuizResults(null);
  };

  const handleSubmitQuiz = () => {
    if (!selectedModule) return;
    
    const answers = selectedModule.questions.map((_, index) => userAnswers[index] || 0);
    
    if (answers.some((a) => a === 0)) {
      toast({ title: "Incomplete", description: "Please answer all questions before submitting.", variant: "destructive" });
      return;
    }
    
    submitQuizMutation.mutate({ moduleId: selectedModule.id, answers });
  };

  if (modulesLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (selectedModule) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{selectedModule.name}</h3>
          <Button variant="outline" onClick={() => setSelectedModule(null)} data-testid="button-back-to-modules">
            Back to Modules
          </Button>
        </div>

        {!isQuizMode && !quizResults && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Learning Materials</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                  {selectedModule.learningMaterials || "No learning materials available for this module."}
                </div>
              </CardContent>
            </Card>

            {selectedModule.questions.length > 0 && (
              <Button onClick={handleStartQuiz} className="w-full" data-testid="button-start-quiz">
                <GraduationCap className="h-4 w-4 mr-2" />
                Start Quiz ({selectedModule.questions.length} questions)
              </Button>
            )}
          </div>
        )}

        {isQuizMode && (
          <div className="space-y-6">
            <Alert>
              <AlertDescription>
                Answer all questions below and click Submit to see your results.
              </AlertDescription>
            </Alert>

            {selectedModule.questions.map((question, index) => (
              <Card key={question.id} data-testid={`card-question-${index}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Question {index + 1}: {question.question}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={userAnswers[index]?.toString() || ""}
                    onValueChange={(value) => setUserAnswers((prev) => ({ ...prev, [index]: parseInt(value) }))}
                  >
                    {[question.choice1, question.choice2, question.choice3, question.choice4].map((choice, choiceIndex) => (
                      <div key={choiceIndex} className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={(choiceIndex + 1).toString()}
                          id={`q${index}-choice${choiceIndex + 1}`}
                          data-testid={`radio-q${index}-choice${choiceIndex + 1}`}
                        />
                        <Label htmlFor={`q${index}-choice${choiceIndex + 1}`} className="cursor-pointer">
                          {choice}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            ))}

            <Button 
              onClick={handleSubmitQuiz} 
              className="w-full" 
              disabled={submitQuizMutation.isPending}
              data-testid="button-submit-quiz"
            >
              {submitQuizMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Submit Quiz
            </Button>
          </div>
        )}

        {quizResults && (
          <div className="space-y-6">
            <Card className={quizResults.score >= 70 ? "border-green-500" : "border-red-500"}>
              <CardHeader>
                <CardTitle className="text-center text-2xl">
                  Your Score: {quizResults.score}%
                </CardTitle>
                <CardDescription className="text-center">
                  {quizResults.correctAnswers} out of {quizResults.totalQuestions} correct
                </CardDescription>
              </CardHeader>
            </Card>

            {quizResults.results.map((result, index) => (
              <Card key={result.questionId} className={result.isCorrect ? "border-green-200" : "border-red-200"}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    {result.isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <CardTitle className="text-base">Question {index + 1}: {result.question}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.choices.map((choice, choiceIndex) => {
                      const choiceNum = choiceIndex + 1;
                      const isUserAnswer = choiceNum === result.userAnswer;
                      const isCorrect = choiceNum === result.correctAnswer;
                      
                      return (
                        <div
                          key={choiceIndex}
                          className={`p-2 rounded ${
                            isCorrect
                              ? "bg-green-100 border border-green-300"
                              : isUserAnswer && !result.isCorrect
                              ? "bg-red-100 border border-red-300"
                              : ""
                          }`}
                        >
                          {choice}
                          {isCorrect && <Badge className="ml-2" variant="default">Correct</Badge>}
                          {isUserAnswer && !isCorrect && <Badge className="ml-2" variant="destructive">Your Answer</Badge>}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button onClick={handleStartQuiz} className="w-full" variant="outline" data-testid="button-retake-quiz">
              Retake Quiz
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-lg font-medium">
        Welcome, {user?.name || "User"}!
      </div>

      {modules.length === 0 ? (
        <Alert>
          <AlertDescription>
            No training modules available yet. Please check back later.
          </AlertDescription>
        </Alert>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Module Name</TableHead>
              <TableHead className="text-center">Questions</TableHead>
              <TableHead className="text-center">Your Score</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.filter(m => m.isActive).map((module) => {
              const score = getScoreForModule(module.id);
              return (
                <TableRow key={module.id} data-testid={`row-module-${module.id}`}>
                  <TableCell className="font-medium">{module.name}</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">
                    {score ? (
                      <Badge variant={score.score >= 70 ? "default" : "secondary"}>
                        {score.score}%
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">Not taken</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => fetchModuleMutation.mutate(module.id)}
                      disabled={fetchModuleMutation.isPending}
                      data-testid={`button-open-module-${module.id}`}
                    >
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function SetupTab() {
  const { toast } = useToast();
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [moduleName, setModuleName] = useState("");
  const [learningMaterials, setLearningMaterials] = useState("");
  const [selectedModuleForQuestions, setSelectedModuleForQuestions] = useState<SlTrainingModule | null>(null);
  const [csvContent, setCsvContent] = useState("");

  const { data: modules = [], isLoading } = useQuery<SlTrainingModule[]>({
    queryKey: ["/api/sl-training/modules"],
  });

  const createModuleMutation = useMutation({
    mutationFn: async (data: { name: string; learningMaterials: string }) => {
      const response = await apiRequest("POST", "/api/sl-training/modules", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Module created successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/sl-training/modules"] });
      setIsAddingModule(false);
      setModuleName("");
      setLearningMaterials("");
    },
    onError: (error) => {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to create module", variant: "destructive" });
    },
  });

  const updateModuleMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SlTrainingModule> }) => {
      const response = await apiRequest("PATCH", `/api/sl-training/modules/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Module updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/sl-training/modules"] });
    },
    onError: (error) => {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to update module", variant: "destructive" });
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/sl-training/modules/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Module deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/sl-training/modules"] });
    },
    onError: (error) => {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to delete module", variant: "destructive" });
    },
  });

  const uploadQuestionsMutation = useMutation({
    mutationFn: async ({ moduleId, csvContent }: { moduleId: string; csvContent: string }) => {
      const response = await apiRequest("POST", `/api/sl-training/modules/${moduleId}/questions`, { csvContent });
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Success", description: `${data.questionsCount} questions uploaded successfully.` });
      setSelectedModuleForQuestions(null);
      setCsvContent("");
    },
    onError: (error) => {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to upload questions", variant: "destructive" });
    },
  });

  const handleCreateModule = () => {
    if (!moduleName.trim()) {
      toast({ title: "Error", description: "Module name is required", variant: "destructive" });
      return;
    }
    createModuleMutation.mutate({ name: moduleName, learningMaterials });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
    };
    reader.readAsText(file);
  };

  const handleUploadQuestions = () => {
    if (!selectedModuleForQuestions || !csvContent.trim()) {
      toast({ title: "Error", description: "Please select a CSV file", variant: "destructive" });
      return;
    }
    uploadQuestionsMutation.mutate({ moduleId: selectedModuleForQuestions.id, csvContent });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Training Modules</h3>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="/api/sl-training/sample-csv" download data-testid="button-download-sample-csv">
              <Download className="h-4 w-4 mr-2" />
              Sample CSV
            </a>
          </Button>
          <Button onClick={() => setIsAddingModule(true)} data-testid="button-add-module">
            <Plus className="h-4 w-4 mr-2" />
            Add Module
          </Button>
        </div>
      </div>

      {modules.length === 0 ? (
        <Alert>
          <AlertDescription>
            No modules yet. Click "Add Module" to create your first training module.
          </AlertDescription>
        </Alert>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Module Name</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.map((module) => (
              <TableRow key={module.id} data-testid={`row-setup-module-${module.id}`}>
                <TableCell className="font-medium">{module.name}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={module.isActive ? "default" : "secondary"}>
                    {module.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedModuleForQuestions(module)}
                      data-testid={`button-upload-questions-${module.id}`}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Questions
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateModuleMutation.mutate({ id: module.id, updates: { isActive: !module.isActive } })}
                      data-testid={`button-toggle-active-${module.id}`}
                    >
                      {module.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this module?")) {
                          deleteModuleMutation.mutate(module.id);
                        }
                      }}
                      data-testid={`button-delete-module-${module.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={isAddingModule} onOpenChange={setIsAddingModule}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Training Module</DialogTitle>
            <DialogDescription>
              Create a new training module with learning materials.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="module-name">Module Name *</Label>
              <Input
                id="module-name"
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value)}
                placeholder="e.g., Sponsor Licence Basics"
                data-testid="input-module-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="learning-materials">Learning Materials</Label>
              <Textarea
                id="learning-materials"
                value={learningMaterials}
                onChange={(e) => setLearningMaterials(e.target.value)}
                placeholder="Enter the learning content for this module..."
                rows={8}
                data-testid="textarea-learning-materials"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingModule(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateModule} 
              disabled={createModuleMutation.isPending}
              data-testid="button-create-module"
            >
              {createModuleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Module
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedModuleForQuestions} onOpenChange={() => setSelectedModuleForQuestions(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Questions for {selectedModuleForQuestions?.name}</DialogTitle>
            <DialogDescription>
              Upload a CSV file with questions. Format: Question, Choice1, Choice2, Choice3, Choice4, CorrectAnswer (1-4)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csv-file">CSV File</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                data-testid="input-csv-file"
              />
            </div>
            {csvContent && (
              <Alert>
                <AlertDescription>
                  File loaded. {csvContent.split('\n').length - 1} rows detected (excluding header).
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedModuleForQuestions(null); setCsvContent(""); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleUploadQuestions} 
              disabled={uploadQuestionsMutation.isPending || !csvContent}
              data-testid="button-upload-csv"
            >
              {uploadQuestionsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Upload Questions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
