import GroupTest from "../models/GroupTest.js"
import Test from "../models/Tests.js";


const groupTest = async (req, res) => {
    try {
        // console.log(req.body);
        const {
            groupCategory,
            groupName,
            groupPrice,
            testFields,
        } = req.body;

        const groupTest = new GroupTest({
            groupCategory,
            groupName,
            groupPrice,
            testFields,
        });

        const createdGroupTest = await groupTest.save();

        res.status(201).json(createdGroupTest);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export const getgroupTests = async (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    try {
        const tests = await GroupTest.find();
        // console.log('Fetched tests:', tests);
        res.json(tests);
    } catch (error) {
        console.error('Error fetching tests:', error);
        res.status(500).json({ error: 'Failed to fetch tests' });
    }
}


export const fintGroupTestById = async (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    try {
        const groupId = req.params.id; // Get the group id from the route parameter

        // Use findById to fetch the group by id
        const group = await GroupTest.findById(groupId);

        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        // Create an array to store the results
        const populatedTestFields = [];

        // Loop through the testFields array in the group
        for (const testField of group.testFields) {
            // Use the populate method to get the testName for each testId
            const populatedTestField = await Test.findById(testField.testId).select('name');
            
            if (populatedTestField) {
                populatedTestFields.push({
                    testId: testField.testId,
                    subCat: testField.subCat,
                    testName: populatedTestField.name,
                });
            }
        }

        // Add the populated test fields to the group object or return separately as needed
        group.testFields = populatedTestFields;

        res.json(group);
    } catch (error) {
        console.error('Error fetching group:', error);
        res.status(500).json({ error: 'Failed to fetch Group' });
    }
};

export const updateGroupTestById = async (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    const { updatedGroupTest, selectedTestsData } = req.body;
    
    try {

        const groupId = req.params.id; // Get the patient id from the route parameter

        // Find the original group test
        const originalGroup = await GroupTest.findById(groupId);

        if (!originalGroup) {
            return res.status(404).json({ error: "Group not found" });
        }

        // Identify added and deleted tests
        const addedTests = selectedTestsData.filter(selectedTest => {
            return !originalGroup.testFields.some(originalTest => originalTest.testId === selectedTest.testId);
        });

        const deletedTests = originalGroup.testFields.filter(originalTest => {
            return !selectedTestsData.some(selectedTest => selectedTest.testId === originalTest.testId);
        });

        // Combine the updated testFields array with existing details
        const updatedTestFields = [
            ...originalGroup.testFields.filter(test => !deletedTests.includes(test)),
            ...addedTests,
            ...updatedGroupTest.testFields
        ];

        // Update the group test details
        originalGroup.groupCategory = updatedGroupTest.groupCategory;
        originalGroup.groupName = updatedGroupTest.groupName;
        originalGroup.groupPrice = updatedGroupTest.groupPrice;
        originalGroup.testFields = updatedTestFields;

        // Save the updated group test
        const updatedGroup = await originalGroup.save();

        res.status(200).json(updatedGroup);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }

}

export const deleteGroup = async (req, res) => {

    const groupId  = req.params.id;
  
    try {
      const deletedGroup = await GroupTest.findByIdAndDelete(groupId);
  
      if (!deletedGroup) {
        return res.status(404).json({ message: 'Group Test not found' });
      }
  
      res.json({ message: 'Group Test deleted successfully' });
    } catch (error) {
      console.error('Error deleting Group Test:', error);
      res.status(500).json({ error: 'An error occurred while deleting the group test' });
    }
  }

export default groupTest