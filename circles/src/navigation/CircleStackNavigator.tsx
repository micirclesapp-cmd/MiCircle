import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/main/HomeScreen';
import CircleScreen from '../screens/circle/CircleScreen';
import CircleChatScreen from '../screens/circle/CircleChatScreen';
import CirclePlannerScreen from '../screens/circle/CirclePlannerScreen';
import CircleMemoryLaneScreen from '../screens/circle/CircleMemoryLaneScreen';
import CircleExpensesScreen from '../screens/circle/CircleExpensesScreen';
import CircleMembersScreen from '../screens/circle/CircleMembersScreen';
import CircleSettingsScreen from '../screens/circle/CircleSettingsScreen';
import AvailabilityCheckScreen from '../screens/circle/AvailabilityCheckScreen';
import AddExpenseScreen from '../screens/circle/AddExpenseScreen';
import CreatePlanScreen from '../screens/circle/CreatePlanScreen';
import CreatePollScreen from '../screens/circle/CreatePollScreen';
import { Routes } from '../constants/routes';

const Stack = createNativeStackNavigator();

export default function CircleStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        animationEnabled: true,
      }}
    >
      <Stack.Screen
        name={Routes.CIRCLES_HOME}
        component={HomeScreen}
        options={{ title: 'Circles' }}
      />
      <Stack.Screen
        name={Routes.CIRCLE}
        component={CircleScreen}
        options={({ route }) => ({
          title: route.params?.circleName || 'Circle',
        })}
      />
      <Stack.Screen
        name={Routes.CIRCLE_CHAT}
        component={CircleChatScreen}
        options={({ route }) => ({
          title: route.params?.circleName || 'Chat',
        })}
      />
      <Stack.Screen
        name={Routes.CIRCLE_PLANNER}
        component={CirclePlannerScreen}
        options={{ title: 'Plans' }}
      />
      <Stack.Screen
        name={Routes.CIRCLE_MEMORY_LANE}
        component={CircleMemoryLaneScreen}
        options={{ title: 'Memory Lane' }}
      />
      <Stack.Screen
        name={Routes.CIRCLE_EXPENSES}
        component={CircleExpensesScreen}
        options={{ title: 'Expenses' }}
      />
      <Stack.Screen
        name={Routes.CIRCLE_MEMBERS}
        component={CircleMembersScreen}
        options={{ title: 'Members' }}
      />
      <Stack.Screen
        name={Routes.CIRCLE_SETTINGS}
        component={CircleSettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen
        name={Routes.AVAILABILITY_CHECK}
        component={AvailabilityCheckScreen}
        options={{ title: 'Check Availability' }}
      />
      <Stack.Screen
        name={Routes.ADD_EXPENSE}
        component={AddExpenseScreen}
        options={{ title: 'Add Expense' }}
      />
      <Stack.Screen
        name={Routes.CREATE_PLAN}
        component={CreatePlanScreen}
        options={{ title: 'Create Plan' }}
      />
      <Stack.Screen
        name={Routes.CREATE_POLL}
        component={CreatePollScreen}
        options={{ title: 'Create Poll' }}
      />
    </Stack.Navigator>
  );
}
