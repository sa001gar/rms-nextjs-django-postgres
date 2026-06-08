"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { School } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import api from "@/lib/api/client"; // Ensure this import is correct based on alias
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

// Schema for validation
const schoolSchema = z.object({
  name: z.string().min(1, "School Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  pincode: z.string().min(1, "Pincode is required"),
  student_id_prefix: z
    .string()
    .min(1, "Prefix is required")
    .max(10, "Prefix too long")
    .optional(),
});

type SchoolFormValues = z.infer<typeof schoolSchema>;

interface SchoolProfileFormProps {
  initialData: School;
}

export function SchoolProfileForm({ initialData }: SchoolProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<SchoolFormValues>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      name: initialData.name,
      email: initialData.email,
      phone: initialData.phone,
      website: initialData.website || "",
      address: initialData.address,
      city: initialData.city,
      state: initialData.state,
      pincode: initialData.pincode,
      student_id_prefix: initialData.student_id_prefix || "STU",
    },
  });

  const onSubmit = async (data: SchoolFormValues) => {
    setIsSubmitting(true);
    try {
      await api.patch(`/schools/${initialData.id}/`, data);
      toast.success("School profile updated successfully");
      // Invalidate the query to fetch fresh data
      queryClient.invalidateQueries({ queryKey: ["school", initialData.id] });
    } catch (error) {
      toast.error("Failed to update school profile");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>School Profile</CardTitle>
        <CardDescription>
          Update your school's information and contact details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">School Name</Label>
              <Input id="name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="student_id_prefix">Student ID Prefix</Label>
              <Input
                id="student_id_prefix"
                {...form.register("student_id_prefix")}
                placeholder="STU"
              />
              <p className="text-xs text-muted-foreground">
                Used for auto-generating student IDs (e.g., STU_2024_001)
              </p>
              {form.formState.errors.student_id_prefix && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.student_id_prefix.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register("email")} />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...form.register("phone")} />
              {form.formState.errors.phone && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                {...form.register("website")}
                placeholder="https://..."
              />
              {form.formState.errors.website && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.website.message}
                </p>
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...form.register("address")} />
              {form.formState.errors.address && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.address.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" {...form.register("city")} />
              {form.formState.errors.city && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.city.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" {...form.register("state")} />
              {form.formState.errors.state && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.state.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode</Label>
              <Input id="pincode" {...form.register("pincode")} />
              {form.formState.errors.pincode && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.pincode.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
