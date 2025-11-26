import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  TrendingUp,
  Target,
  PiggyBank,
  Plus,
  Trash2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { PrototypeNotice } from "@/components/prototype-notice";

interface BudgetCategory {
  id: string;
  name: string;
  budgeted: number;
  spent: number;
}

interface FinancialGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  dueDate: string;
}

export default function FinancialToolkitPage() {
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([
    { id: "1", name: "Housing", budgeted: 2000, spent: 2000 },
    { id: "2", name: "Groceries", budgeted: 600, spent: 420 },
    { id: "3", name: "Entertainment", budgeted: 300, spent: 180 },
  ]);

  const [goals, setGoals] = useState<FinancialGoal[]>([
    {
      id: "1",
      title: "Emergency Fund",
      targetAmount: 10000,
      currentAmount: 6500,
      dueDate: "2025-12-31",
    },
    {
      id: "2",
      title: "Vacation Fund",
      targetAmount: 5000,
      currentAmount: 2000,
      dueDate: "2025-06-30",
    },
  ]);

  const [newCategory, setNewCategory] = useState({ name: "", budget: "" });
  const [newGoal, setNewGoal] = useState({
    title: "",
    target: "",
    current: "",
    date: "",
  });
  const { toast } = useToast();

  const handleAddCategory = () => {
    if (!newCategory.name || !newCategory.budget) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const category: BudgetCategory = {
      id: Date.now().toString(),
      name: newCategory.name,
      budgeted: parseFloat(newCategory.budget),
      spent: 0,
    };

    setBudgetCategories((prev) => [...prev, category]);
    setNewCategory({ name: "", budget: "" });
    toast({
      title: "Category Added",
      description: "Budget category created successfully",
    });
  };

  const handleAddGoal = () => {
    if (
      !newGoal.title ||
      !newGoal.target ||
      !newGoal.current ||
      !newGoal.date
    ) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const goal: FinancialGoal = {
      id: Date.now().toString(),
      title: newGoal.title,
      targetAmount: parseFloat(newGoal.target),
      currentAmount: parseFloat(newGoal.current),
      dueDate: newGoal.date,
    };

    setGoals((prev) => [...prev, goal]);
    setNewGoal({ title: "", target: "", current: "", date: "" });
    toast({
      title: "Goal Added",
      description: "Financial goal created successfully",
    });
  };

  const handleDeleteCategory = (id: string) => {
    const category = budgetCategories.find((c) => c.id === id);
    if (category && category.spent > 0) {
      toast({
        title: "Cannot Delete",
        description:
          "Cannot delete a category with expenses. Set spent to $0 first.",
        variant: "destructive",
      });
      return;
    }
    setBudgetCategories((prev) => prev.filter((c) => c.id !== id));
    toast({ title: "Category Deleted" });
  };

  const handleDeleteGoal = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    toast({ title: "Goal Deleted" });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto py-12 space-y-6">
        <PrototypeNotice />
        <div className="flex items-center gap-3">
          <DollarSign className="h-10 w-10 text-primary" />
          <div>
            <h1 className="text-3xl font-bold" data-testid="title-financial">
              Financial Communication Toolkit
            </h1>
            <p className="text-muted-foreground">
              Navigate money conversations together
            </p>
          </div>
        </div>

        <Tabs defaultValue="budget" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-[600px]">
            <TabsTrigger value="budget" data-testid="tab-budget">
              Budget
            </TabsTrigger>
            <TabsTrigger value="goals" data-testid="tab-goals">
              Goals
            </TabsTrigger>
            <TabsTrigger value="values" data-testid="tab-values">
              Values
            </TabsTrigger>
          </TabsList>

          <TabsContent value="budget" className="space-y-6">
            <Card data-testid="card-budget-overview">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-6 w-6" />
                  Budget Overview
                </CardTitle>
                <CardDescription>Track spending by category</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {budgetCategories.map((category) => {
                    const percentage =
                      category.budgeted > 0
                        ? (category.spent / category.budgeted) * 100
                        : 0;
                    const isOverBudget = percentage > 100;

                    return (
                      <div
                        key={category.id}
                        className="space-y-2"
                        data-testid={`category-${category.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="font-medium"
                              data-testid={`category-name-${category.id}`}
                            >
                              {category.name}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCategory(category.id)}
                              className="h-6 w-6"
                              data-testid={`button-delete-category-${category.id}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <span
                            className={`text-sm ${isOverBudget ? "text-destructive font-medium" : "text-muted-foreground"}`}
                            data-testid={`category-spent-${category.id}`}
                          >
                            ${category.spent.toFixed(2)} / $
                            {category.budgeted.toFixed(2)}
                          </span>
                        </div>
                        <Progress
                          value={Math.min(percentage, 100)}
                          className={`h-2 ${isOverBudget ? "[&>div]:bg-destructive" : ""}`}
                          data-testid={`progress-${category.id}`}
                        />
                      </div>
                    );
                  })}
                </div>

                <Card className="bg-muted/30">
                  <CardHeader>
                    <CardTitle className="text-base">
                      Add Budget Category
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category-name">Category Name</Label>
                        <Input
                          id="category-name"
                          value={newCategory.name}
                          onChange={(e) =>
                            setNewCategory((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          placeholder="e.g., Dining Out"
                          data-testid="input-category-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category-budget">Monthly Budget</Label>
                        <Input
                          id="category-budget"
                          type="number"
                          value={newCategory.budget}
                          onChange={(e) =>
                            setNewCategory((prev) => ({
                              ...prev,
                              budget: e.target.value,
                            }))
                          }
                          placeholder="0.00"
                          data-testid="input-category-budget"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          onClick={handleAddCategory}
                          className="w-full"
                          data-testid="button-add-category"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="goals" className="space-y-6">
            <Card data-testid="card-goals-overview">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-6 w-6" />
                  Financial Goals
                </CardTitle>
                <CardDescription>
                  Track your shared financial objectives
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {goals.map((goal) => {
                    const progress =
                      (goal.currentAmount / goal.targetAmount) * 100;

                    return (
                      <Card
                        key={goal.id}
                        className="hover-elevate"
                        data-testid={`goal-${goal.id}`}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <CardTitle
                              className="text-lg"
                              data-testid={`goal-title-${goal.id}`}
                            >
                              {goal.title}
                            </CardTitle>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteGoal(goal.id)}
                              className="h-6 w-6"
                              data-testid={`button-delete-goal-${goal.id}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <CardDescription data-testid={`goal-due-${goal.id}`}>
                            Due: {new Date(goal.dueDate).toLocaleDateString()}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Progress
                              </span>
                              <span
                                className="font-medium"
                                data-testid={`goal-progress-${goal.id}`}
                              >
                                {progress.toFixed(0)}%
                              </span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="text-sm">
                              <div className="text-muted-foreground">
                                Current
                              </div>
                              <div
                                className="font-semibold text-lg"
                                data-testid={`goal-current-${goal.id}`}
                              >
                                ${goal.currentAmount.toLocaleString()}
                              </div>
                            </div>
                            <div className="text-sm text-right">
                              <div className="text-muted-foreground">
                                Target
                              </div>
                              <div
                                className="font-semibold text-lg"
                                data-testid={`goal-target-${goal.id}`}
                              >
                                ${goal.targetAmount.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <Card className="bg-muted/30">
                  <CardHeader>
                    <CardTitle className="text-base">
                      Add Financial Goal
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="goal-title">Goal Title</Label>
                        <Input
                          id="goal-title"
                          value={newGoal.title}
                          onChange={(e) =>
                            setNewGoal((prev) => ({
                              ...prev,
                              title: e.target.value,
                            }))
                          }
                          placeholder="e.g., Down Payment for House"
                          data-testid="input-goal-title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="goal-target">Target Amount</Label>
                        <Input
                          id="goal-target"
                          type="number"
                          value={newGoal.target}
                          onChange={(e) =>
                            setNewGoal((prev) => ({
                              ...prev,
                              target: e.target.value,
                            }))
                          }
                          placeholder="0.00"
                          data-testid="input-goal-target"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="goal-current">Current Amount</Label>
                        <Input
                          id="goal-current"
                          type="number"
                          value={newGoal.current}
                          onChange={(e) =>
                            setNewGoal((prev) => ({
                              ...prev,
                              current: e.target.value,
                            }))
                          }
                          placeholder="0.00"
                          data-testid="input-goal-current"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="goal-date">Target Date</Label>
                        <Input
                          id="goal-date"
                          type="date"
                          value={newGoal.date}
                          onChange={(e) =>
                            setNewGoal((prev) => ({
                              ...prev,
                              date: e.target.value,
                            }))
                          }
                          data-testid="input-goal-date"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          onClick={handleAddGoal}
                          className="w-full"
                          data-testid="button-add-goal"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Goal
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="values" className="space-y-6">
            <Card data-testid="card-values">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PiggyBank className="h-6 w-6" />
                  Money Values Assessment
                </CardTitle>
                <CardDescription>
                  Understand your financial priorities together
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-muted-foreground">
                    Understanding each other's money values is crucial for
                    healthy financial communication. Money represents different
                    things to different people - security, freedom, status, or
                    experiences.
                  </p>
                  <div className="mt-6 space-y-4">
                    <div className="bg-primary/10 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Discussion Prompts</h4>
                      <ul className="space-y-2 text-sm">
                        <li>What did you learn about money growing up?</li>
                        <li>What does financial security mean to you?</li>
                        <li>How do you feel about debt?</li>
                        <li>
                          What are your top 3 financial priorities right now?
                        </li>
                        <li>
                          How should we make big financial decisions together?
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
